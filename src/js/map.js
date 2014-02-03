var legend;
      var selected;
      var map;
      
      require([
        "esri/map", 
        "esri/graphic",
        "esri/tasks/RelationshipQuery",

        "esri/layers/FeatureLayer",

        "esri/symbols/SimpleMarkerSymbol",

        "esri/dijit/editing/Editor",
        "esri/dijit/editing/TemplatePicker",

        "esri/tasks/query", 
        "esri/tasks/QueryTask",

        "esri/dijit/HomeButton",
        "esri/dijit/Geocoder",
        "esri/dijit/LocateButton",
        "esri/InfoTemplate",
        "esri/graphic",
        "esri/symbols/PictureMarkerSymbol",
        "esri/dijit/BasemapGallery",

        "esri/symbols/SimpleFillSymbol", 
        "esri/symbols/SimpleLineSymbol", 
        "esri/renderers/SimpleRenderer", 
        "esri/graphic",
        "dojo/_base/Color",

        "esri/dijit/Legend",

        "esri/dijit/Scalebar",
        "esri/geometry/scaleUtils",
        "esri/dijit/OverviewMap",

        "esri/config",
        "esri/request",

        "dojo/_base/array", 
        "dojo/parser", 
        "dojo/dom",
        "dojo/Deferred",

        "dojo/domReady!"
      ], function(
        Map, Graphic, RelationshipQuery,
        FeatureLayer,
        SimpleMarkerSymbol,
        Editor, TemplatePicker,
        Query, QueryTask,
        HomeButton, Geocoder, LocateButton, InfoTemplate, Graphic, PictureMarkerSymbol, BasemapGallery,

        SimpleFillSymbol, SimpleLineSymbol, SimpleRenderer, Graphic, Color,

        Legend,
        Scalebar, scaleUtils, OverviewMap,
        esriConfig, esriRequest,
        arrayUtils, parser, dom, Deferred
      ) {
        parser.parse();  

        var map = new Map("map", {
          basemap:"national-geographic",
          center: [-77.5, 41],
          zoom: 8,
          logo: true,
          slider: true,
          sliderPosition: "top-left",
          sliderStyle: 'large',
          wrapAround180: true
        });

        dojo.addClass(map.infoWindow.domNode, "myTheme");

        map.on("layers-add-result", initEditing);
        map.on("mouse-move", showCoordinates);
        map.on("load", function(){
          showCoordinates(map.extent.getCenter())
        });

        /*
         * Add SimpleMarkerSymbol and a SimpleRenderer to change the style of the points of the feature layer.
         * Using the SimpleMarkerSymbol gives no options on styling points differently e.g. active vs. inactive
         * TODO use either UniqueValueRender or ClassBreakRender - has to be fixed
         * SimpleMarkerSymbol is the basis for all renderers.
         */
        // var symbol = new esri.symbol.SimpleMarkerSymbol();
        // symbol.style = esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE;
        // symbol.outline = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([66,66,66]), 0.5); //[150,229,249]), 0.5);
        // // symbol.setSize(15); symbol.setColor(new Color([0,153,193])); // blue
        // symbol.setSize(15); symbol.setColor(new Color([230,211,1])); // yellow
        // // symbol.setSize(15); symbol.setColor(new Color([244,109,11])); // orange
        // var renderer = new esri.renderer.SimpleRenderer(symbol);
            

        /* 
         * UniqueValueRenderer
         * Specify trackIdField in featureLayer and use the Drawing info - Unique Value Renderer - Field 1 - 
         * Unique Value Infos - and use its value which has to be a string!
         *
         */
        // var renderer = new esri.renderer.UniqueValueRenderer(symbol, "SiteStatus");
        // renderer.addValue( "Active Site", new esri.symbol.SimpleFillSymbol().setColor(new Color([0,153,193]))); 
        // renderer.addValue( "Inactive Site", new esri.symbol.SimpleFillSymbol().setColor(new Color([230,211,1]))); 
        
        /*
         * ClassBreaksRenderer
         * Uses a field as identifieder which has to be a number (not a string)
         * TODO not working yet, not sure what's wrong...
         */
        // var renderer = new esri.renderer.ClassBreaksRenderer(symbol, "SurveyType");
        // renderer.addBreak(0, 5, new esri.symbol.SimpleFillSymbol().setColor(new Color([0,153,193]))); 
        // renderer.addBreak(6, Infinity, new esri.symbol.SimpleFillSymbol().setColor(new Color([230,211,1])));
        
        var wells = new FeatureLayer("http://services2.arcgis.com/Hq6thdRH56GlK76e/ArcGIS/rest/services/MacroinvertebrateWaterMonitoring_Test/FeatureServer/0", {
          mode: FeatureLayer.MODE_ONDEMAND,
          // trackIdField: "SiteStatus", // for UniqueValueRenderer
          outFields: ["*"],
          opacity: 1,
          id: "wells"
        });

        //wells.setRenderer(renderer);

        // add a graphics layer for geocoding results
        var graphicsLayer = new esri.layers.GraphicsLayer({id: "results"});

        // add feature and graphics layer
        map.addLayers([wells, graphicsLayer]);
        //map.addLayer(graphicsLayer);

        //basemap gallery
        var basemapGallery = new esri.dijit.BasemapGallery({
            showArcGISBasemaps: true,
            //layers: getLayers(),
            map: map
        }, "basemapGallery");
        basemapGallery.startup();

        // home back to initial map location
        var home = new HomeButton({
            map: map
        }, "HomeButton");
        home.startup();

        /*
         * TO DO  get layer name dynamically
         *        add close button on legend pane
         */
        var legend = new Legend({
           map :map,   
           layerInfos : [{
              layer:wells, 
              title: "Survey Sites"
            }]
        }, "legendDiv");
        legend.startup();

        /* geo locate search with grpahic
         * TO DO style info template
         */
        geocoder = new Geocoder({
          //autoComplete: true, // interferes with interferes with displaying a graphic and info window
          map: map,
          arcgisGeocoder: {
            placeholder: "Find a place"
          }
        }, "search");
        geocoder.startup();
        geocoder.focus();
        var searchResult = new PictureMarkerSymbol({
          "angle":0,
          "xoffset":0,
          "yoffset":10,
          "type":"esriPMS",
          "url":"http://static.arcgis.com/images/Symbols/Basic/RedStickpin.png",
          //"url":"http://static.arcgis.com/images/Symbols/Shapes/BluePin1LargeB.png",
          "contentType":"image/png",
          "width":24,
          "height":24
        });
        var searchTemplate = new esri.InfoTemplate("Search location:", "${name}");
        dojo.connect(geocoder, "onFindResults", function(response) {
          var l = map.getLayer("results");
          l.clear();
          map.infoWindow.hide();
          dojo.forEach(response.results, function(r) {
            r.feature.attributes.name = r.name;
            r.feature.setSymbol(searchResult);
            r.feature.setInfoTemplate(searchTemplate);
            l.add(r.feature);
          });
          graphicsLayer.show();
        });

        /* locate button
         * TO DO style info template
         */
        var location = new PictureMarkerSymbol({
          "angle":0,
          "xoffset":0,
          "yoffset":10,
          "type":"esriPMS",
          "url":"http://static.arcgis.com/images/Symbols/Basic/RedStickpin.png",//http://static.arcgis.com/images/Symbols/Basic/RedShinyPin.png", //http://static.arcgis.com/images/Symbols/Shapes/CopperBrownPin1LargeB.png",
          "contentType":"image/png",
          "width":24,
          "height":24
        });
        var locateTemplate = new InfoTemplate("Your location:", "${name}");
        var geoLocate = new LocateButton({
          map: map,
          infoTemplate: locateTemplate,
          symbol: location
          //highlightLocation: false,
          //showPointer: true,
          //pointerGraphic: new Graphic(null, new PictureMarkerSymbol('img/locate.png', 21, 21))
        }, "LocateButton");
        geoLocate.startup();

        //scale bar            
        var scalebar = new Scalebar({
            map: map,
            scalebarUnit:"metric",
            scalebarStyle: "ruler"
        });

        //overview map
        var overviewMap = new OverviewMap({
            map: map,
            attachTo: "bottom-left",
            visible: false
        });
        overviewMap.startup();

        //scale and coordinates
        function showCoordinates(evt) {
          var id=dojo.byId("coordinates");
          if(id===null||id===undefined){
            console.error("coords div not defined");
            return;
          }
          var mp = esri.geometry.webMercatorToGeographic(evt.mapPoint||evt);
          var scale = scaleUtils.getScale(map);
          //display mouse coordinates
          if(mp===null||mp===undefined)return;
          id.innerHTML = "Scale: 1 : " + commaSeparateNumber(Math.round(scale)) + " | Lat: " + mp.y.toFixed(6) + "&deg; Lon: " + mp.x.toFixed(6) + "&deg;";
        } 

        /* Loads all map specific features and handles related query */
        function initEditing(evt) {

          //map.infoWindow.resize(250,210);
          var wells = map.getLayer("wells");

          /* start related queries */
          var title, content, graphicAttributes;
          
          var relatedQuery = new RelationshipQuery();
          relatedQuery.outFields = ["*"];
          relatedQuery.relationshipId = 0;

          wells.on("click", function(evt) {
            graphicAttributes = evt.graphic.attributes;
            title = graphicAttributes.SiteName + " (" + graphicAttributes.OrgID + ")";
            content = "";

            relatedQuery.objectIds = [graphicAttributes.OBJECTID]; // set object id from selected site to make query
            wells.queryRelatedFeatures(relatedQuery, function(relatedRecords) {

              // if(JSON.stringify(relatedRecords.undefined.features.length) > 1){
              content = content + '<div class="date-content"><select id="dates" onchange="getDetailData();"><option id="dateSelector" value="Select a date"> Select a date </option>';

              for(var i=0; i<relatedRecords.undefined.features.length; i++){
                var d = new Date(0); // The 0 there is the key, which sets the date to the epoch  
                d = new Date(parseInt(JSON.stringify(relatedRecords.undefined.features[i].attributes.SurveyDate+14400000))); // added 4 hours in seconds to match actual date
                var month =  parseInt(d.getMonth())+parseInt(1);
                if (month<=9) month = "0"+month;

                var day = d.getDate();
                if (day <= 9) day = "0"+day;

                //var specimenObjectId = JSON.stringify(relatedRecords.undefined.features[0].attributes.OBJECTID);
                content = content + "<option value="+ JSON.stringify(relatedRecords.undefined.features[i].attributes.DTI) +">" + day + "/" + month + "/" + d.getFullYear() + " </option>";
              }
              
              content = content + "</select><div id='specimen'><ul></ul></div></div>";

              // } else if(JSON.stringify(relatedRecords.undefined.features.length) == 1){
             
              // }

              //content = content + "<div id='specimen'><ul></ul></div>";
            
               // map.infoWindow.setTitle(title);
               // map.infoWindow.setContent(content);
               // map.infoWindow.show(evt.screenPoint, map.getInfoWindowAnchor(evt.screenPoint));

              // jquery custom pop up
              showCustomPopUp(content);
              
              //load detail data for inital view for dropdowns
              // if(JSON.stringify(relatedRecords.undefined.features.length) > 1){
                // map.infoWindow.onShow( getDetailData() );
              // }

            });

          });
          // end initEditing function
        } 

        // custom jquery popup on click
        function showCustomPopUp(c){
          $( "#dialog" ).dialog();
          $( "#dates" ).remove();
          $( "#specimen" ).remove();
          $( ".date-content").remove();
          $( ".date" ).append(c);
          $( "#accordion" ).accordion();

          // custom close button for info dialog (- )customPopup) workaround
          $(".ui-dialog-titlebar-close").css('background-image', 'url(img/close.png)');
          $(".ui-dialog-titlebar-close").css('border', 'none');
          $(".ui-dialog-titlebar-close").css('width','20');
          $(".ui-dialog-titlebar-close").css('height','20');
          $(".ui-dialog-titlebar-close").css('background-repeat','no-repeat');
          $(".ui-dialog-titlebar-close").css('background-position','center center');
          $('.ui-icon').css('display','none');


        }

        /* executes queries based onchange events from dropdown by chosen date */
        getDetailData = function(objectId) {

          // remove all li from id specimen to dispolay new data set
          $('#specimen ul > li').remove();
          // remove select date statement
          $('#dateSelector').remove();

          var speciesname, tsn, tsnQueryString = "";
          
          var tsnQuery = new Query();
          var tsnQueryTask = new QueryTask("http://services2.arcgis.com/Hq6thdRH56GlK76e/ArcGIS/rest/services/MacroinvertebrateWaterMonitoring_Test/FeatureServer/2");
          
          tsnQuery.where = "DTI = '" + document.getElementById("dates").value + "'"; //get entries by DTI from date selection
          //console.log(document.getElementById("dates").value);
          //console.log(tsnQuery.where);
          tsnQuery.outFields = ["TSN, SpecimenCount"];
          tsnQuery.orderByFields = ["SpecimenCount"];

          var nameQuery = new Query();
          var nameQueryTask = new QueryTask("http://services2.arcgis.com/Hq6thdRH56GlK76e/ArcGIS/rest/services/MacroinvertebrateWaterMonitoring_Test/FeatureServer/4");

          var tsns = new Array(); // save all tsns in array for output
          var scounts = new Array(); // save all specimen counts in array for output

          if(document.getElementById("dates").value.localeCompare("Select a date") != 0 ){
          // get tsn by selected date
            tsnQueryTask.execute(tsnQuery, function(tsnData){
              for(var i=0; i < tsnData.features.length; i++){
                tsn = JSON.stringify(tsnData.features[i].attributes.TSN);
                scount = JSON.stringify(tsnData.features[i].attributes.SpecimenCount);
                tsnQueryString = tsnQueryString  + "TSN = " + tsn + " or "; // build string with multiple values
                tsns[i] = tsn;
                scounts[i] = scount;
              }
              // get names for tsn numbers
              tsnQueryString = tsnQueryString.slice(0, tsnQueryString.length-3); // drop last "or"
              nameQuery.where = tsnQueryString;
              nameQuery.outFields = ["SciName"];

              if(nameQuery.where){
                nameQueryTask.execute(nameQuery, function(speciesList){

                  if(speciesList.features.length > 0){
                    for(var j=speciesList.features.length-1; j >= 0; j--){
                      speciesName = JSON.stringify(speciesList.features[j].attributes.SciName);
                      speciesName = speciesName.replace(/\"/g,"");
                      var speciesLink = speciesName.toLowerCase().replace(/ /g,"/");
                      /*
                      //build link for hover to show macroinvertebrates.org on mouse over
                      var imageLink = "http://macroinvertebrates.org/img/thumbnails/gigapans/viewer/" + tsns[j] + "@2x.jpg";
                      console.log(imageLink);
                      imageLink = "http://macroinvertebrates.org/img/thumbnails/gigapans/viewer/131502@2x.jpg";
                      $("#specimen ul").append('<li style="list-style:none; class="specList"><a href="http://macroinvertebrates.org/#/' + speciesLink + '" onmouseover="document.getElementById(\'place-holder-1\').src=\'http://macroinvertebrates.org/img/thumbnails/gigapans/viewer/131502@2x.jpg\';" onmouseout="document.getElementById(\'place-holder-1\').src=\'placeholder.png\';" target="blank" > ' + speciesName + '<img src="placeholder.png" id="place-holder-1" /></a>' + " " + scounts[j] + " " + '</li>');
                      */
                      //link to macroinvertebrates
                      //$("#specimen ul").append('<li style="list-style:none; class="specList"><a href="http://macroinvertebrates.org/#/' + speciesLink + '" target="blank" > ' + speciesName + '</a>' + scounts[j] + '</li>');
                      $("#specimen ul").append('<tr style="list-style:none; class="specList"><td><a href="http://macroinvertebrates.org/#/' + speciesLink + '" target="blank" > ' + speciesName + '</a></td><td>' + scounts[j] + '</td></tr>');
                      //link to ITIS with tsn
                      //$("#specimen ul").append('<li style="list-style:none;"><a href="http://www.itis.gov/servlet/SingleRpt/SingleRpt?search_topic=TSN&search_value=' + tsns[j] + '" target="blank"> ' + speciesName + '</a>' + " " + scounts[j] + " " + '</li>');
                    }
                  } else {
                    $("#specimen ul").append('<li style="list-style:none;">There was no data collected</li>');
                  }

                });
              } else {
                  $("#specimen ul").append('<li style="list-style:none;">No specimens available</li>');
              }
            }, function(noResults){ // error callback
              $("#specimen ul").append('<li style="list-style:none;">No Results</li>');
            });
          }
        }

        /* jequery stuff */
        $(document).ready(function(){
          /* add toggle functionality to the legend */
           $('#legendButton').click(function(){
             $('#legendContainer').toggle();
           });
           $('#legendCloseButton').click(function(){
             $('#legendContainer').toggle();
           });
           $('.HomeButton').click(function(){ // hide graphic with geo search result "reset"
              // var l = map.getLayer("results");
              // l.clear();
              graphicsLayer.hide();
           });
           $('.esriGeocoderReset').click(function(){ // hide graphic with geo search result "reset"
              // var l = map.getLayer("results");
              // l.clear();
              graphicsLayer.hide();
           });
           $('.LocateButton').click(function(){ // hide graphic with geo search result "reset"
              graphicsLayer.show();
           });


           
            $ (".date").css("height","200px");


        });

        /* all draggable divs */
        $(function() {
            $("#legendContainer").draggable();
        });

      });

      /* --------- helper functions -------------*/ 
      
      function commaSeparateNumber(val){
          while (/(\d+)(\d{3})/.test(val.toString())){
            val = val.toString().replace(/(\d+)(\d{3})/, '$1'+','+'$2');
          }
          return val;
      }