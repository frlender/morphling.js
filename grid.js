var generateGrid = function(sideTileCount,polePadding){
	// require underscore.js
	// generate a grid of designated number of tiles on a sphere as a GeoJSON
	// MultiLineString object 
	if(polePadding==undefined) polePadding = 10; // degrees 
	var latitudeAngles = _.range(-(90-polePadding),90-polePadding,
		2*(90-polePadding)/sideTileCount);
	latitudeAngles.push(90-polePadding);
	var longitudeAngles = _.range(-180,180,360/sideTileCount);

	longitudeLines = _.map(longitudeAngles,function(angle){
		return [[angle,-(90-polePadding)],[angle,0],[angle,90-polePadding]];
	});

	latitudeLines = _.map(latitudeAngles,function(angle){
		var accessoryAngles = _.range(-180,180+2.5,2.5);
		return _.map(accessoryAngles,function(accessoryAngle){
			return [accessoryAngle,angle];
		});
	});

	return longitudeLines.concat(latitudeLines);
}


var generateTiles = function(sideTileCount,polePadding){
	// generate a grid of designated number of tiles on a sphere as multiple
	// GeoJson polygon objects. 
	if(polePadding==undefined) polePadding = 10; // degrees
	var latitudeLineLength = 360/sideTileCount;
	var longitudeLineLength = 2*(90-polePadding)/sideTileCount;
	// make the unit around 2.5
	var unitLength = 2.5
	var latitudeLineUnit = latitudeLineLength/Math.floor(latitudeLineLength/unitLength);
	var longitudeLineUnit = longitudeLineLength/Math.floor(longitudeLineLength/unitLength);
	
	var getEachTile = function(upperLeftPoint){
		var startLongitude = upperLeftPoint[0];
		var startLatitude = upperLeftPoint[1];
		var upperSide = _.range(startLongitude,startLongitude+latitudeLineLength,latitudeLineUnit);
		upperSide.push(startLongitude+latitudeLineLength);
		var lowerSide = upperSide.slice(0).reverse();
		upperSide = _.map(upperSide,function(unit){
			return [unit,startLatitude];
		});

		lowerSide = _.map(lowerSide,function(unit){
			return [unit,startLatitude-longitudeLineLength];
		});

		var rightSide = _.range(startLatitude,startLatitude-longitudeLineLength,-longitudeLineUnit);
		rightSide.shift();
		var leftSide = rightSide.slice(0).reverse();

		rightSide = _.map(rightSide,function(unit){
			return [startLongitude+latitudeLineLength,unit];
		});

		leftSide = _.map(leftSide,function(unit){
			return [startLongitude,unit];
		});

		var tile = upperSide.concat(rightSide.concat(lowerSide.concat(leftSide.concat([upperLeftPoint]))));
		
		return {type:"Feature",geometry:{type:"MultiPolygon",coordinates:[[tile]]}};
	}

	var latitudeRange = _.range(90-polePadding,-(90-polePadding),-longitudeLineLength);
	var longitudeRange = _.range(-180,180,latitudeLineLength);

	var upperLeftPoints = []
	_.each(latitudeRange,function(eachLatitude){
		_.each(longitudeRange,function(eachLongitude){
			upperLeftPoints.push([eachLongitude,eachLatitude]);
		});
	});


	var polygons = _.map(upperLeftPoints,function(upperLeftPoint){
		return getEachTile(upperLeftPoint);
	});

	return polygons;

}