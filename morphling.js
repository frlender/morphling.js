// require _,d3 jslib.

var Morphling = function(){
	// Morphling is a Dota hero who can convert its strength to aiglity back and forth.

	var obj = {};
	// svgInfo stores variables that describe the state of the svg.
	obj.svgInfo = {};
	obj.svgInfo.clickRegion = null;
	obj.getEquirectOrthographicProjection = function(EquiToOrtho){
		// boolean EquiToOrtho argument determines the direction of animation.
		//True denotes equiretangular to orthographic transition while false
		//denotes otherwise.
			return interpolatedProjection(
		 			d3.geo.orthographic()
        			.scale(240)
        			.translate([width / 2, height / 2]),
    			d3.geo.projection(function(λ, φ){
        			return [λ/2,φ*9/8]
        			}).scale(145)
        			.translate([width / 2, height / 2]),
        			EquiToOrtho);
		}

	function interpolatedProjection(a, b,reverse) {
  		var projection = d3.geo.projection(raw).scale(1),
      	center = projection.center,
      	translate = projection.translate,
      	reverseA,
      	α;
	
  		function raw(λ, φ) {
    		var pa = a([λ *= 180 / Math.PI, φ *= 180 / Math.PI]), pb = b([λ, φ]);
    	return [(1 - α) * pa[0] + α * pb[0], (α - 1) * pa[1] - α * pb[1]];
  		}
	
  		projection.alpha = function(_) {
    		if (reverse){
      		if (!arguments.length) return (1-α);
      		reverseA = +_;
      		α = 1-reverseA;
    		}
    		else{
      		if (!arguments.length) α;
      		α = +_;
    		}
    		var ca = a.center(), cb = b.center(),
        		ta = a.translate(), tb = b.translate();
    		center([(1 - α) * ca[0] + α * cb[0], (1 - α) * ca[1] + α * cb[1]]);
    		translate([(1 - α) * ta[0] + α * tb[0], (1 - α) * ta[1] + α * tb[1]]);
    		return projection;
  		};
		
  		delete projection.scale;
  		delete projection.translate;
  		delete projection.center;
  		return projection.alpha(0);
	}

	function _animationEqui2ortho(svg,projection,path,feature) {
  		svg.transition()
      		.duration(1000)
      		.tween("projection", function() {
        		return function(delta) {
          		projection.alpha(delta);
          		feature.attr("d", path);
        		};
      		})
      		.transition()
      		.duration(0)
      		.each("end",function(){
        		projection = obj.chiralOrthographicProjection;
        		path.projection(projection);
        		feature.attr("d",path);
        		obj.addEventsForChiralOrthographic(svg,projection,path,feature);
        		svg.on("dblclick",function(){
        			_animationOrtho2equi(svg,projection,path,feature);
        		});
      		});
	}

	obj.animationEqui2ortho = function(svg,projection,path,feature){
		_animationEqui2ortho(svg,projection,path,feature);
	}


	obj.rearrangeForOrthographic = function(tiles){
  		// svg does not support z-index so the tiles have to rearranged as such that 
  		// tiles that will appear on top of the projection are appeneded last to svg. 
  		var sideCount = Math.sqrt(tiles.length);
  		var iter = function(tiles){
    		if(!tiles.length) return []
    		var latitudeTiles = tiles.slice(0,sideCount);
    		var range = _.range(0,sideCount);
    		var midPoint = Math.ceil(sideCount/2);
    		var firstHalf = range.slice(0,midPoint).reverse();
    		var lastHalf = range.slice(midPoint);
    		var reorderedLatitudeTiles = [];
    		var reorder = function(firstHalf,lastHalf,isFirstHalf){
      		if(isFirstHalf&&firstHalf.length){
        		reorderedLatitudeTiles.push(latitudeTiles[firstHalf[0]]);
        		reorder(firstHalf.slice(1),lastHalf,false);
      		}
      		if(!isFirstHalf&&lastHalf.length){
        		reorderedLatitudeTiles.push(latitudeTiles[lastHalf[0]]);
        		reorder(firstHalf,lastHalf.slice(1),true);
      		}
    		}
    		reorder(firstHalf,lastHalf,true);
    		return reorderedLatitudeTiles.concat(iter(tiles.slice(sideCount)));
  		}
  		return iter(tiles);
	}

	// the mirror projection of orthographic projection. You can find it has 
	// to be mirrored if you place an orthographic projection and a equirectanglular
	// projection of the same map side by side.
	obj.chiralOrthographicProjection = d3.geo.projection(function(λ, φ){
    					return [Math.cos(φ)*Math.sin(-λ),Math.sin(φ)]
					})
    					.scale(240)
    					.translate([width / 2, height / 2])
    					.rotate([180,0,0])
    					.clipAngle(90);

    obj.addEventsForChiralOrthographic = function(svg,projection,path,feature){
    	// events to rotate the sphere.
    	var ismouseDown = false;

		var reverseX = false;
		
		var longitudeScale = d3.scale.linear().domain([0,300]).range([0,180]);
		var latitudeScale = d3.scale.linear().domain([0,300]).range([0,90]);
		
		var preRotation = projection.rotate();
		var preMousePosition = null;
  		svg.on("mousemove",function(){
    		if(ismouseDown){
      		var currentMousePosition = d3.mouse(this);
      		var xStep = currentMousePosition[0]-preMousePosition[0];
      		var yStep = currentMousePosition[1]-preMousePosition[1];
      		var updateRotationX = reverseX?preRotation[0]+longitudeScale(xStep):
              		preRotation[0]-longitudeScale(xStep);
      		var updateRotationY = preRotation[1]-latitudeScale(yStep);
      		projection.rotate([updateRotationX,updateRotationY]);
      		feature.attr("d",path);
    		}
  		}).on("mousedown",function(){
    		ismouseDown = true; 
    		preMousePosition = d3.mouse(this);
    		var currentRotation = projection.rotate();
    		if((currentRotation[1]>=180&&currentRotation[1]<=360)||
      		(currentRotation[1]>=-180&&currentRotation[1]<=0)){
        		reverseX = !(d3.mouse(this)[1]>projection([0,90])[1]);
    		}else{
        		reverseX = !(d3.mouse(this)[1]<projection([0,-90])[1]);
		
    		}
  		}).on("mouseup",function(){
    		ismouseDown = false;
    		preMousePosition = null;
    		preRotation = projection.rotate();
  		});
    }

    obj.dismantleEventsFromChiralOrthographic = function(svg){
    	svg.on("mousemove",null).on("mousedown",null).on("mouseup",null);
    }

    obj.rotateToInitialPosition = function(svg,projection,path,feature){
    	// before orthographic to equirectangular animation, rotate the orthographic
    	// projection to initial position.
    	var currentRotation = projection.rotate(),
    		initialRotation = [180,0];

    	var marginX = Math.abs(currentRotation[0]-initialRotation[0]),
    		marginY = Math.abs(currentRotation[1]-initialRotation[1]),
    		margin = marginX>marginY?marginX:marginY;
    	
    	var maxDuration = 2000,
    		durationScale = d3.scale.linear().domain([0,90])
    										 .range([0,maxDuration]);

    	var duration = margin>90?maxDuration:durationScale(margin);
    	

    	return svg.transition().duration(duration).tween("foo",function(){
        	return function(delta){
          		projection.rotate([(180-currentRotation[0])*delta+
          			currentRotation[0],(0-currentRotation[1])*delta+
          			currentRotation[1]]);
          		feature.attr("d",path);
        	}
     	 });
    }

    function _animationOrtho2equi(svg,projection,path,feature){
    	obj.dismantleEventsFromChiralOrthographic(svg);
    	obj.rotateToInitialPosition(svg,projection,path,feature)
    	   .each("end",function(){
    	   	   projection = obj.getEquirectOrthographicProjection(false);
    	   	   path.projection(projection);
    	   	   feature.attr("d",path);
    	   	   svg.transition().duration(1000)
    	   	   	   .tween("projection",function(){
    	   	   	   	return function(delta){
    	   	   	   		projection.alpha(delta);
    	   	   	   		feature.attr("d",path);
    	   	   	   	}
    	   	   	   }).each("end",function(){
    	   	   	   		if(obj.svgInfo.clickRegion=="upDown"){
    	   	   	   			svg.append(function(){return obj.svgInfo.normalSvgTiles[0][0]});
    						obj.svgInfo.rotatedSvgTiles.remove();
    						feature = svg.selectAll("path");
    	   	   	   			obj.animationRotateBackToNormal(svg)
    	   	   	   			   .each("end",function(){
    	   	   	   			   		obj.svgInfo.clickRegion = null;
    	   	   	   			   		projection = obj.getEquirectOrthographicProjection(true);
    	   	   	   			   		path.projection(projection);
    	   	   	   			   		obj.addDblclickEvent(svg,projection,path,feature);
    	   	   	   			   });
    	   	   	   		}else{
    	   	   	   			obj.svgInfo.clickRegion = null;
    	   	   	   			projection = obj.getEquirectOrthographicProjection(true);
    	   	   	   			path.projection(projection);
    	   	   	   			obj.addDblclickEvent(svg,projection,path,feature);
    	   	   	   		}
    	   	   	   });

    	   });
    }


    obj.rotateTilesData90degree = function(tiles){
    	var sideCount = Math.sqrt(tiles.length);
    	var rotatedTiles = [];

    	for(var i=0;i<sideCount;i++){
    		var columnTiles = [];
    		for(var j=0;j<sideCount;j++){
    			columnTiles.push(tiles[i+j*sideCount]);
    		}
    		rotatedTiles = rotatedTiles.concat(columnTiles.reverse());
    	}

    	return rotatedTiles;
    }


    obj.detectMouseClickRegion = function(clickPoint,stageCenter){
    	var yMinusXCriterion = clickPoint[1]-clickPoint[0]-
    					stageCenter[1]+stageCenter[0],
    		yPlusXCriterion = clickPoint[1]+clickPoint[0]-
    					stageCenter[1]-stageCenter[0];
    	return yMinusXCriterion*yPlusXCriterion>0?"upDown":"leftRight";
    }


    obj.animationRotate90degree = function(svg){
    	return svg.transition().duration(2000).tween("rotation",function(){
              return function(delta){
              feature.attr("transform","rotate("+90*delta+
                ","+obj.svgInfo.stageCenter[0]+","+obj.svgInfo.stageCenter[1]+")");
              }
          });
    }

    obj.animationRotateBackToNormal = function(svg){
    	return svg.transition().duration(2000).tween("rotation",function(){
    		return function(delta){
              feature.attr("transform","rotate("+(90*(1-delta))+
                ","+obj.svgInfo.stageCenter[0]+","+obj.svgInfo.stageCenter[1]+")");
              }
    	});
    }

    obj.addDblclickEvent = function(svg,projection,path,feature){

    	 svg.on("dblclick",function(){
      		obj.svgInfo.clickRegion = obj.detectMouseClickRegion(d3.mouse(this),
            		obj.svgInfo.stageCenter);
      		if(obj.svgInfo.clickRegion=="leftRight")
        		obj.animationEqui2ortho(svg,projection,path,feature);
      		else{
          		obj.animationRotate90degree(svg).each("end",function(){
          			obj.svgInfo.rotatedSvgTiles.style("display","inline");
              		obj.svgInfo.normalSvgTiles.remove();
              		feature = svg.selectAll("path");
              		obj.animationEqui2ortho(svg,projection,path,feature);
          		});
        		//selection.append takes as argument either a tag name of constant 
        		//string or as a function that returns the DOM element to append.
    		// rotatedSvgTiles[0][0] is the corresponding DOM element of the selection 
    			obj.svgInfo.rotatedSvgTiles.style("display","none");
        		svg.append(function(){return obj.svgInfo.rotatedSvgTiles[0][0]});
		
      		}
		
    	});
    }



    return obj;

}