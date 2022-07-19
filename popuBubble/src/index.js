import {Deck}  from '@deck.gl/core';
import {ScatterplotLayer, SolidPolygonLayer, GeoJsonLayer} from '@deck.gl/layers';
import {DataFilterExtension} from '@deck.gl/extensions';
import {MapboxOverlay} from '@deck.gl/mapbox';
  class Mapset {

    constructor (data, map, canvasID, tooltipID) {
      this.data = data;
      this.map = map;
      this.canvasID = canvasID;
      this.tooltipID = tooltipID;
      this.compMapset = [];

      this.currentZoom = 0;
      this.unit = 1;

      this.dataMap = new Map();
      this.features;
      this.maxValue = 0;
      this.minValue = 0;
      this.deckOverlay =  new MapboxOverlay({
        //interleaved: false,
        layers: []
      }); 
      
    }

    updateSliderData() {

      sliderInstance.update({
        //to : sliderInstance.options.max==sliderInstance.options.to? Math.log(maxValue) : sliderInstance.options.to,
        max: (() => { 
          let maxValue = 0;
          mapsetArr.forEach( (mapset)=> {
            maxValue = d3.max([maxValue, mapset.maxValue]);
          });          
          return Math.log(maxValue);
        })(),    
        to: (() => { 
          let maxValue = 0;
          mapsetArr.forEach( (mapset)=> {
            maxValue = d3.max([maxValue, mapset.maxValue]);
          });          
          return Math.log(maxValue);
        })(),    
      });
      showMin = sliderInstance.options.from;
      showMax = sliderInstance.options.to;
      //console.log("updateSlider : "+showMin+","+showMax);
    }

    functionDraw() {

      d3.select("#contents")
                  .append("svg")
                  .attr("id", this.tooltipID)
                  .style("pointer-events", "none");
                  //.append("g");
      //let currentZoom;// = 0;// map.getZoom();    
      //let features;
      //let maxValue = 0;
      //let minValue = 0;


      //데이터 WGS84 변환
      this.features = this.data.features.map(({geometry, properties, type})=>{
        const [x,y] = proj4('EPSG:5179','EPSG:4326',geometry.coordinates);
        geometry = {
          coordinates : [x,y],
          type : geometry.type
        };
        return {x:x, y:y, value : properties.popu};
      });

      //canvas 셋팅
      const container = this.map.getCanvasContainer();

      const w0 = container.offsetWidth;
      const h0 = window.innerHeight;
      const canvas = d3.select(container)
          .append("canvas")
          .attr("id", this.canvasID)
          .attr("width", w0)
          .attr("height", h0);
          //.attr("z-index", 10);  
      
      //console.log("zoom : " + this.map.getZoom());
      this.checkZoomAndRenewData();

      this.map.on("viewreset", () => {
        if (syncMaps) {
          //console.log("viewreset!!!!!!!!!!!!!!!!!!!!!!!!!");
          if (!preventAdditionalEvent) {
            const center = this.map.getCenter();
            const zoom = this.map.getZoom();
            const pitch = this.map.getPitch();
            const bearing = this.map.getBearing();

            preventAdditionalEvent = true;
            this.compMapset.forEach( (mapset)=> {
              //console.log(map);
              mapset.map.setCenter(center);
              mapset.map.setZoom(zoom);
              mapset.map.setPitch(pitch);
              mapset.map.setBearing(bearing);
              mapset.render();
            });
            preventAdditionalEvent = false;
            //console.log("sync");
          }
        }
        
        this.render();
        
      });
      this.map.on("move", (e) => {
        if (syncMaps) {
          //console.log("move!!!!!!!!!!!!!!!!!!!!!!!!!");
          if (!preventAdditionalEvent) {
            const center = this.map.getCenter();
            const zoom = this.map.getZoom();
            const pitch = this.map.getPitch();
            const bearing = this.map.getBearing();

            preventAdditionalEvent = true;
            this.compMapset.forEach( (mapset)=> {
              //console.log(map);
              mapset.map.setCenter(center);
              mapset.map.setZoom(zoom);
              mapset.map.setPitch(pitch);
              mapset.map.setBearing(bearing);
              mapset.render();
            });
            preventAdditionalEvent = false;
            //console.log("sync");
          }
        }
        
        this.render();
        const tooltip = d3.select("#"+this.tooltipID);  
        //
        d3.selectAll(".tooltipTxt").remove();
        //tooltip.selectAll("text").remove();         
        
      });
      // this.map.on("moveend",() => {
      //   if (syncMaps) {
      //     console.log("moveEnd!!!!!!!!!!!!!!!!!!!!!!!!!");
      //     if (!preventAdditionalEvent) {
      //       const center = this.map.getCenter();
      //       const zoom = this.map.getZoom();
      //       const pitch = this.map.getPitch();
      //       const bearing = this.map.getBearing();

      //       preventAdditionalEvent = true;
      //       this.compMapset.forEach( (mapset)=> {
      //         //console.log(map);
      //         mapset.map.setCenter(center);
      //         mapset.map.setZoom(zoom);
      //         mapset.map.setPitch(pitch);
      //         mapset.map.setBearing(bearing);
      //         mapset.render();
      //       });
      //       preventAdditionalEvent = false;
      //       //console.log("sync");
      //     }
      //   }
        
      //   this.render();
        
      // });
      
      this.map.on('click', (e) => {
        const unit = this.unit;
        const [x1,y1] = proj4('EPSG:4326','EPSG:5179', [e.lngLat.lng, e.lngLat.lat]);
        const key = parseInt(x1/unit) * 10000 +
                            parseInt(y1/unit);

        if (this.dataMap.has(key)) {
          const value = this.dataMap.get(key); 
          if (Math.log(value) >= showMin && Math.log(value)<= showMax) {
            showMin = Math.log(value);//data.from;
            sliderInstance.update({
              from : showMin            
            });
            mapsetArr.forEach(mapset=>mapset.render()); 
          }
          //console.log("click!");
        }
      });


      

      this.map.on('mousemove', (e) => {
 
        d3.selectAll(".tooltipTxt").remove();
        const thisValue = this.showTooltip(e);
        let otherValues = [];
        this.compMapset.forEach((map)=> {
          const value = map.showTooltip(e);
          otherValues.push(value);
        }); 
        //console.log(otherValues.length);
        if (thisValue.value >0 && otherValues[0].value>0) {
          const p1 = thisValue;
          const p2 = otherValues[0];
          //console.log("this : "+thisValue.value +", other : "+otherValues[0].value);
          this.showTooltipLink(p1, p2);          
        }
                //console.log(mousePos);
      });

      this.updateSliderData();
      this.render();


    }

    showTooltip(e) {
        const unit = this.unit;
        // `e.point` is the x, y coordinates of the `mousemove` event
        // relative to the top-left corner of the map.
       // console.log(e.point);
        
        const [x1,y1] = proj4('EPSG:4326','EPSG:5179', [e.lngLat.lng, e.lngLat.lat]);
        
        const key = parseInt(x1/unit) * 10000 +
                          parseInt(y1/unit);
        
        const tooltip = d3.select("#"+this.tooltipID);  
        //
        //tooltip.selectAll(".tooltipTxt").remove();
           
        let tooptipValue = {x:0, y:0, value:0};
        if (this.dataMap.has(key)) {
          //console.log([x1,y1]);
          const value = this.dataMap.get(key); 
          if (Math.log(value) >= showMin && Math.log(value)<= showMax) {

            //그리드 사각박스 그리기 좌표
            const mouse5179 = {x : x1, y : y1,
                          swx : parseInt(x1/unit)*unit, swy : parseInt(y1/unit)*unit,
                          nex : parseInt(x1/unit)*unit + unit, ney : parseInt(y1/unit)*unit + unit};
            const [swLat, swLng] = proj4('EPSG:5179','EPSG:4326', [mouse5179.swx, mouse5179.swy]);
            const [neLat, neLng] = proj4('EPSG:5179','EPSG:4326', [mouse5179.nex, mouse5179.ney]);

            const swP = this.map.project(new mapboxgl.LngLat(swLat, swLng));
            const neP = this.map.project(new mapboxgl.LngLat(neLat, neLng));
            //console.log(value);
            //const [x,y] = [e.point.x, e.point.y];
                      
            tooltip.append("rect")
                    .attr("class", "tooltipTxt")
                    .attr("x", swP.x)
                    .attr("y", neP.y)
                    .attr("width", neP.x-swP.x)
                    .attr("height", swP.y-neP.y)
                    .attr('stroke', 'black')
                    .attr('fill','black')
                    .attr('opacity', 0.5);

            tooltip.append("rect")
                    .attr("class", "tooltipTxt")
                    .attr("x", (swP.x+neP.x)/2-50)
                    .attr("y", neP.y-40)
                    .attr("width", 100)
                    .attr("height", 25)
                    .attr('stroke', 'black')
                    .attr('fill','black')
                    .attr('opacity', 0.8);              
            
            tooltip.append("text")
                    .attr("class", "tooltipTxt")
                    .attr("id","tooltipText")
                    .attr("x", (swP.x+neP.x)/2)
                    .attr("y",  neP.y-20)
                    .attr("text-anchor","middle")
                    .attr("alignment-baseline","alphabetic")
                    .style("font-family", "Arial Black")
                    .style("font-size", "20px")
                    .style("fill", "white")
                    .text(value.toLocaleString('ko-KR', {maximumFractionDigits:0}));
            //const text = d3.select('#tooltip');
            //text.text(`here~~`);
            tooptipValue = {x:(swP.x+neP.x)/2-50, y:neP.y-40,
                            value :value,
                            base : document.querySelector("#"+this.tooltipID).getBoundingClientRect()};
          } 
          
        }

        return tooptipValue;
    };

    showTooltipLink(p1, p2) {
      
      //console.log(p1.base);
      const tooltip = d3.select("#"+this.tooltipID);  
      const isP1Left = p1.base.left<p2.base.left;
      tooltip.append("rect")
                .attr("class", "tooltipTxt")
                .attr("x", p1.base.left>p2.base.left? p1.x-160 : p1.x+110)
                .attr("y", p1.y-10)
                .attr("width", 150)
                .attr("height", 40)
                //.attr('stroke', 'black')
                .attr('fill','#222222')
                .attr('opacity', 0.9);

      tooltip.append("rect")
                .attr("class", "tooltipTxt")
                .attr("x", p1.base.left>p2.base.left? p1.x-160 : p1.x)
                .attr("y", p1.y-50)
                .attr("width", 260)
                .attr("height", 40)
                //.attr('stroke', 'black')
                .attr('fill','#222222')
                .attr('opacity', 0.9);

      //이어주는 링크 선
      const qPath = d3.path();
      const pFrom = { x:  p2.base.left + p2.x + (isP1Left? 0:100),      y :p2.y+12.5 };
      const pTo =   { x:  p1.base.left + p1.x + (isP1Left? 260:-160),   y :p1.y+12.5 };
      qPath.moveTo( pFrom.x, pFrom.y);
      qPath.quadraticCurveTo( (pTo.x*7 + pFrom.x*3)/10, d3.max([pTo.y, pFrom.y])-100, 
                              pTo.x, pTo.y );
      d3.select("#tooltipWhole").append("path")
                .attr("class", "tooltipTxt")
                .attr("d", qPath)                    
                .attr('stroke', '#ffffff')
                .attr('stroke-opacity', 0.8)
                .attr('stroke-width', '3px')
                .attr('fill','none');
                

      let valueStr;
      if ( p1.base.left < p2.base.left) {
        if (p1.value > p2.value) valueStr = ">";
        else if (p1.value == p2.value) valueStr = "=";
        else valueStr = "<";
      } else {
        if (p2.value > p1.value) valueStr = ">";
        else if (p1.value == p2.value) valueStr = "=";
        else valueStr = "<";
      }
      //const valueStr = p1.base.left > p2.base.left? 
                    p1.value >

      //부등호
      tooltip.append("text")
                .attr("class", "tooltipTxt")
                .attr("id","tooltipTextComp")
                .attr("x", p1.base.left<p2.base.left? p1.x+110 : p1.x-10)
                .attr("y",   p1.y+30)
                .attr("text-anchor", p1.base.left < p2.base.left? "start" : "end")
                .attr("alignment-baseline","alphabetic")
                .style("font-family", "Arial Black")
                .style("font-size", "50px")
                .style("fill", "white")
                .text(valueStr);
      //반대편 수          
      tooltip.append("text")
                .attr("class", "tooltipTxt")
                .attr("id","tooltipTextComp1")
                .attr("x", p1.base.left<p2.base.left? p1.x+150 : p1.x-50)
                .attr("y",   p1.y+20)
                .attr("text-anchor", p1.base.left < p2.base.left? "start" : "end")
                .attr("alignment-baseline","alphabetic")
                .style("font-family", "Arial Black")
                .style("font-size", "20px")
                .style("fill", "#a0a0a0")
                .text(p2.value.toLocaleString('ko-KR', {maximumFractionDigits:0}));
                
      //비교값-배수
      const compValue = (p1.value/p2.value);
      tooltip.append("text")
                .attr("class", "tooltipTxt")
                .attr("id","tooltipTextComp2")
                .attr("x", p1.base.left<p2.base.left? p1.x+130 : p1.x-30)
                .attr("y",   p1.y-15)
                .attr("text-anchor", "middle")
                .attr("alignment-baseline","alphabetic")
                .style("font-family", "Arial Black")
                .style("font-size", compValue >1.0? "40px" : "25px")
                .style("fill", "white")
                .text( "x"+compValue.toFixed(2));
    }


    render() {
      
      const zoomNowHere = this.map.getZoom()+1.2;

      if (zoomNowHere<=12.5) this.checkZoomAndRenewData();      

        //   //버퍼를 포함한 화면 범위 측정 for frustum culling
        //   const {_sw, _ne} = this.map.getBounds();
        //   _sw.lng -= 0.01;
        //   _sw.lat -= 0.01;
        //   _ne.lng += 0.01;
        //   _ne.lat += 0.01;
        //   //console.log(_sw);
        //const zoomNowHere = this.map.getZoom()+1.2;
        //console.log(zoomNowHere);
        const colorLimit = this.maxValue*0.1;
        const sizeLimit = this.unit/2;

       

        let start = new Date();
        const layers  = [
            new ScatterplotLayer({
                id: 'popu',
                data: this.features,
                // Styles
                filled: true,     
                stroked: true,       
                //radiusMinPixels: size,
                radiusUnit : 'meters',
                radiusScale: pointScale,
                getFilterValue: d => Math.log(d.value),
                filterRange: [showMin, showMax], //uniform buffer의 역할을 함. 아래 extensions와 함께 사용
                getPosition: d => [d.x,d.y],
                getRadius: (d) => {  
                    //let radius;
                    // if (this.currentZoom >= 14) {          
                    //     const r = d3.scaleLinear().domain([0,colorLimit, this.maxValue]).range([0,sizeLimit*sizeLimit*2, 500*500])(d.value);
                        
                    //     radius = Math.pow(r, 0.5) / ((zoomNowHere-13));
                    // } else {   
                        const r = d3.scaleLinear().domain([0,colorLimit, this.maxValue]).range([0,sizeLimit*sizeLimit*0.9,sizeLimit*sizeLimit])(d.value);
                        const radius = Math.pow(r,0.5);
                    //}
                    return radius;
                    
                },
                //sizeUnits: 'pixels',
                getFillColor: (d) => {
                    return this.getColor(d, false);                    
                },

                lineWidthMinPixels: 1.5,
                getLineColor: (d) => {
                    return this.getColor(d, true);
                },
                // Interactive props
                //pickable: true,
                //autoHighlight: true,
                //onHover: ({object}) => object && console.log(`${object.acdnt_dd_dc} (${object.acdnt_age_2_dc})`),
            
                updateTriggers: {
                    //getRadius: [showMin,showMax],
                    getFillColor : [showGreater, highlightGreater],//, showMin,showMax],
                    getLineColor : [showGreater, highlightGreater]//, showMin,showMax]
                },
                visible : true,
                extensions: [new DataFilterExtension({filterSize: 1})]      
            })        
        ];
        let end = new Date(); 
        //console.log(`layer updated: ${(end-start)}ms` );   
        start = new Date();
        this.deckOverlay.setProps({
            layers : layers
        });    
        end = new Date(); 
        //console.log(`setProps updated: ${(end-start)}ms` );   
    }

    getColor(d, isBorder) {

        let opacity = 0.7*255;
        let highlightThis = false;
        if (showGreater||highlightGreater) {
            let showThis = true;
            highlightThis = true;
            this.compMapset.forEach((mapsetComp)=> {
                if (mapsetComp.dataMap.has(d.key)) {
                const value = mapsetComp.dataMap.get(d.key);
                if (d.value<value) { //한번이라도 작으면
                    showThis = false;
                    highlightThis = false;                
                }
                }            
            });
            if (showGreater&&!showThis) opacity = 0;          
        }  
        //if (Math.log(d.value) < showMin || Math.log(d.value)> showMax) opacity = 0;

        
        const sizeLimit = this.unit/2;
        const mapColor = d3.scaleSequential(d3.interpolateYlGnBu).domain([  Math.log(sizeLimit), Math.log(this.maxValue)]);
        let color0 =  d3.color(mapColor(Math.log(d.value)));

        if (highlightGreater&&highlightThis) color0 = d3.rgb(247, 131, 7);
        
        const c0 = isBorder ? 1.8 : 1.0;
        return [color0.r*c0, color0.g*c0, color0.b*c0, opacity];
    }

    renewFeatures(unit) {

      let timeStart, timeEnd;
      this.dataMap.clear();

      timeStart = new Date();  // 시작
      for (let i=0 ; i<this.data.features.length ; i++) {
        const {geometry, properties, type} =  this.data.features[i];
      
      //for ({geometry, properties, type} in this.data.features) {        
        const key = parseInt(geometry.coordinates[0]/unit) * 10000 +
                      parseInt(geometry.coordinates[1]/unit);
        let value = properties.popu;         
        if (this.dataMap.has(key)) {
          value += this.dataMap.get(key); 
        }
        this.dataMap.set(key, value);   
      }   

      //console.log("renew :" +(end-start)+"ms");

      this.features = new Array();
      this.maxValue = 0;
      this.minValue = 999999999999999;
      //console.log(this.dataMap);
  
      for (let [key, value] of this.dataMap) {
        const [ox, oy] =  [ parseInt(key/10000)*unit + unit/2, (key%10000)*unit + unit/2];
        const [x,y] = proj4('EPSG:5179','EPSG:4326', [ox, oy]);
        this.features.push({x:x, y:y, value:value, ox:ox, oy:oy, key:key});
        //업데이트
        if (value<this.minValue) this.minValue = value;
        if (value>this.maxValue) this.maxValue = value;
      }
      timeEnd = new Date();  // 종료  
      //console.log(Math.log(maxValue)+"/"+Math.log(minValue));
      //console.log("---------------renew :" +(timeEnd-timeStart)+"ms");
    }

    checkZoomAndRenewData() {
        const start = new Date();
      if (!dynamicBubble) return;
      //console.log("checkzoom");

      const zoomNow = parseInt(this.map.getZoom()+1.2);

      if (zoomNow != this.currentZoom) {        
        this.currentZoom = parseInt(zoomNow);
        this.unit = unitZoom[Math.min(12, this.currentZoom)];

        this.renewFeatures(this.unit);    
        this.updateSliderData();   

        this.drawGridText(this.unit);
        //console.log(this.currentZoom);     
      }      
      const end = new Date();
     
      //console.log(`time updated: ${(end-start)}ms` );
    }

    drawGridText(unit) {
        const unitStr = unit>=1000? (unit/1000)+"km grid" : unit + "m grid";
        d3.select("#"+this.tooltipID).select(".gridtext").remove();
        const canvas0 = document.getElementById(this.canvasID);
        d3.select("#"+this.tooltipID)
                    .append("text")
                    .attr("class", "gridtext")
                    .attr("x", canvas0.width/2)
                    .attr("y",  47)
                    .attr("text-anchor","middle")
                    //.attr("alignment-baseline","alphabetic")
                    .style("font-family", "Noto Sans CJK KR")
                    .style('font-weight', 'light')
                    .style("font-size", "10px")
                    .style("fill", "white")
                    .text(unitStr);

    }

    
    //파일 읽기
    static loadJson(fileName) {
      
      const file = loadFile(fileName);
      const results = Papa.parse(file, {
        //download: true,
        header : true,
        delimiter :'\t',
        dynamicTyping : true,
        skipEmptyLines: true,
        // complete: function(results) {
        //   //1. features로 변환  
        // }         
      });

      function loadFile(filePath) {
        let result = null;
        const xmlhttp = new XMLHttpRequest();
        xmlhttp.open("GET", filePath, false);
        xmlhttp.send();
        if (xmlhttp.status==200) {
          result = xmlhttp.responseText;
        }
        //console.log(result);
        return result;
      }

      const points = results.data.map((d) => {
            const [x,y] = [(d.x+BASE_UNIT/2), (d.y+BASE_UNIT/2)];
            return turf.point([x,y], {popu : d.value}); 
          });
      const pointsCollection = turf.featureCollection(points);

      const bound = {xmin : d3.min( pointsCollection.features.map(d=>d.geometry.coordinates[0])),
                      xmax : d3.max(  pointsCollection.features.map(d=>d.geometry.coordinates[0])),
                      ymin : d3.min(  pointsCollection.features.map(d=>d.geometry.coordinates[1])),
                      ymax : d3.max(  pointsCollection.features.map(d=>d.geometry.coordinates[1]))                        
                    };
      return pointsCollection;   
          
    }
  }

////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////                       이제 시작                                         ////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////


  const unitZoom = [1000000, 1000000, 500000, 250000, 100000, 50000, 25000, 10000, 5000, 2500, 1000, 500, 250];      
                    //0       1       2       3       4       5       6     7       8     9     10   11   12   13
  let preventAdditionalEvent = false;
  const BASE_UNIT = 250;
  let showMin = 0;
  let showMax = 999999999;

  let syncMaps = true;
  let dynamicBubble = true;
  let showGreater = false;
  let highlightGreater = false;
  let pointScale = 1;

  mapboxgl.accessToken = 'pk.eyJ1Ijoic2JraW00MjciLCJhIjoiY2o4b3Q0aXd1MDdyMjMzbnRxYTdvdDZrbCJ9.GCHi6-mDGEkd3F-knzSfRQ';
  //mapboxgl.setRTLTextPlugin('https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js');

  const map1 = createMap('map1');
  const map2 = createMap('map2');
  //const map3 = createMap('map3');
  initMap(map1);
  initMap(map2);
  //initMap(map3);

  function createMap(containerID) {
    return  new mapboxgl.Map({
      container: containerID, // container ID
      //style: 'mapbox://styles/mapbox/streets-v11', // style URL
      style: 'mapbox://styles/mapbox/dark-v10',
      center: [127.02754, 37.497], // starting position [lng, lat]
      zoom: 10, // starting zoom      
      //projection: 'globe' // display the map as a 3D globe
    });    
  }

  function initMap(map) {
    map.dragRotate.disable(); 
    map.touchZoomRotate.disableRotation();    
    map.addControl(new MapboxLanguage({
      defaultLanguage: 'ko'
    }));
    // map.on('style.load', () => {
    //     map.setFog({}); // Set the default atmosphere style
    // });
  }

  function range(start, end, gap) {
        return Array((end - start)/gap + 1).fill().map((_, idx) => start + (idx*gap));
  } 

  
  //console.log($rangeTime);
  const $rangeTime = $("#staySlider");
  $rangeTime.ionRangeSlider();
  const sliderInstance = $rangeTime.data("ionRangeSlider");

  const $rangeScale = $("#scaleSlider");
  $rangeScale.ionRangeSlider();
  const sliderInstanceScale = $rangeScale.data("ionRangeSlider");  


                  
  const data1 = Mapset.loadJson("./popu2000.tsv");
  const data2 = Mapset.loadJson("./popu2019.tsv");
  // const data3 = Mapset.loadJson("./11350_휴일_생활권.tsv");


  const mapset1 = new Mapset(data1, map1, 'plot1', 'tooltip1');
  const mapset2 = new Mapset(data2, map2, 'plot2', 'tooltip2');
  mapset1.title = "2000년";
  mapset2.title = "2019년";
  // const mapset3 = new Mapset(data3, map3, 'plot3', 'tooltip3');

  //const mapsetArr = [mapset1];
  const mapsetArr = [mapset1, mapset2];
  //const mapsetArr = [mapset1, mapset2, mapset3];

  //각각의 맵에 다른 맵 등록하기
  for (const mapset of mapsetArr) {
    for (const otherMapset of mapsetArr) {
      if (mapset != otherMapset) {
        mapset.compMapset.push(otherMapset);
        //console.log(mapset);
      }
    }
  }


  //두 지도 연계용 svg 생성
  d3.select("#contents")
                .append("svg")
                .attr("id", "tooltipWhole")
                .style("pointer-events", "none");

  //그리기 메인 함수 시작
  mapsetArr.forEach(mapset=>mapset.functionDraw());

  map1.addControl(mapset1.deckOverlay);
  map2.addControl(mapset2.deckOverlay);
  
  //제목달기
  mapsetArr.forEach( (mapset)=>{
    drawTitle(mapset);
    mapset.drawGridText(mapset.unit);
  }); 

  function drawTitle(mapset){
    d3.select("#"+mapset.tooltipID).selectAll(".title").remove();
    const canvas0 = document.getElementById(mapset.canvasID);
    d3.select("#"+mapset.tooltipID)
                  .append("rect")
                  .attr("class", "title")
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("width", canvas0.width)
                    .attr("height", 50)
                    //.attr('stroke', 'black')
                    .attr('fill','black')
                    .attr('opacity', 0.8);

    d3.select("#"+mapset.tooltipID)
                  .append("text")
                  .attr("class", "title")
                  .attr("x", canvas0.width/2)
                  .attr("y",  33)
                  .attr("text-anchor","middle")
                  //.attr("alignment-baseline","alphabetic")
                  .style("font-family", "Noto Sans CJK KR")
                  .style('font-weight', 'Bold')
                  .style("font-size", "30px")
                  .style("fill", "white")
                  .text(mapset.title);
  }


  //range slider 초기 셋팅
  sliderInstance.update({
        skin: "big",
        type: "double",
        //grid : true,
        min: 0,
        max: (() => {
          let maxValue = 0;
          //console.log("maxV :" +maxValue);
          mapsetArr.forEach( (mapset)=> {
            maxValue = d3.max([maxValue, mapset.maxValue]);
          });
          
          return Math.log(maxValue);
        })(),
        //values: valueGrid,
        from: 0,        
        step : 0.0001,
        //prettify_enabled: true,
        //prettify_separator: ",",
        prettify : (n) => {          
          return Math.pow(Math.exp(1),n).toLocaleString('ko-KR', {maximumFractionDigits: 0});
        },
        postfix: "명",
        // onStart: (sliderData) => { 
        //   showMin = sliderData.from;
        //   showMax = sliderData.to;
        //   mapsetArr.forEach(d=>d.render()); 
        // },
        onChange:  (sliderData) => { 
          showMin = sliderData.from;
          showMax = sliderData.to;
          mapsetArr.forEach(d=>d.render()); 
        }
   });

   
//range slider 초기 셋팅
    sliderInstanceScale.update({
        skin: "big",
        //type: "double",
        //grid : true,
        min: 1,
        max: 10,
        //values: valueGrid,
        from: 1,        
        step : 0.01,
        //prettify_enabled: true,
        //prettify_separator: ",",
        //prettify : (n) => ( Math.pow(Math.exp(1),n).toFixed(2)),
        prefix: "x ",
        onStart: (sliderData) => { 
        pointScale = sliderData.from;
        mapsetArr.forEach(d=>d.render()); 
        },
        onChange:  (sliderData) => { 
        pointScale = sliderData.from;
        mapsetArr.forEach(d=>d.render()); 
        }
    });

  //최대최소 업데이트 된 데이터로 다시 그리기 
  showMin = sliderInstance.options.from;
  showMax = sliderInstance.options.to;
  mapsetArr.forEach( (mapset)=> {
    
    mapset.render();
    
  }); 


  //체크박스 버튼
  $(document).ready(function(){
    $('#syncMap').iCheck({
      checkboxClass: 'icheckbox_square-blue',
      //radioClass: 'iradio_square-red',
      increaseArea: '20%' // optional
    });
  });    
  $('#syncMap').on('ifChecked', function(event){
    syncMaps = true;   
    $('#showGreater').iCheck('enable'); 
    $('#highlightGreater').iCheck('enable');  
  });
  $('#syncMap').on('ifUnchecked', function(event){
    syncMaps = false;
    $('#showGreater').iCheck('uncheck'); 
    $('#showGreater').iCheck('disable'); 
    $('#highlightGreater').iCheck('uncheck'); 
    $('#highlightGreater').iCheck('disable'); 
  });


  $(document).ready(function(){
    $('#dynamicBubble').iCheck({
      checkboxClass: 'icheckbox_square-blue',
      //radioClass: 'iradio_square-red',
      increaseArea: '20%' // optional
    });
  });    
  $('#dynamicBubble').on('ifChecked', function(event){
    dynamicBubble = true;
    mapsetArr.forEach(d=>d.render()); 
  });
  $('#dynamicBubble').on('ifUnchecked', function(event){
    dynamicBubble = false;
  });

  
  $(document).ready(function(){
    $('#showGreater').iCheck({
      checkboxClass: 'icheckbox_square-blue',
      //radioClass: 'iradio_square-red',
      increaseArea: '20%' // optional
    });
  });    
  $('#showGreater').on('ifChecked', function(event){
    showGreater = true;
    mapsetArr.forEach(d=>d.render()); 
  });
  $('#showGreater').on('ifUnchecked', function(event){
    showGreater = false;
    mapsetArr.forEach(d=>d.render()); 
  });

  $(document).ready(function(){
    $('#highlightGreater').iCheck({
      checkboxClass: 'icheckbox_square-blue',
      //radioClass: 'iradio_square-red',
      increaseArea: '20%' // optional
    });
  });    
  $('#highlightGreater').on('ifChecked', function(event){
    highlightGreater = true;
    mapsetArr.forEach(d=>d.render()); 
  });
  $('#highlightGreater').on('ifUnchecked', function(event){
    highlightGreater = false;
    mapsetArr.forEach(d=>d.render()); 
  });


  window.addEventListener('resize', function() {
      const h = window.innerHeight;

      mapsetArr.forEach((mapset) => {

        const container = mapset.map.getCanvasContainer();

        const w0 = container.offsetWidth;
        d3.select("#"+mapset.canvasID)
          .attr("width", w0)
          .attr("height", h);  

        
      });    
      mapsetArr.forEach(d=>d.render());
      mapsetArr.forEach( (mapset)=>{
        drawTitle(mapset);
        mapset.drawGridText(mapset.unit);
      }); 
  });