
      var map;
      require([
        "dojo/parser", 
        "dojo/ready",
        "dojo/_base/array",
        "dojo/_base/Color",
        "dojo/dom-style",
        "dojo/query",

        "esri/map", 
        "esri/request",
        "esri/graphic",
        "esri/geometry/Extent",

        "esri/symbols/SimpleMarkerSymbol",
        "esri/symbols/SimpleFillSymbol",
        "esri/symbols/PictureMarkerSymbol",
        "esri/renderers/ClassBreaksRenderer",

        "esri/layers/GraphicsLayer",
        "esri/SpatialReference",
        "esri/geometry/Point",
        "esri/geometry/webMercatorUtils",

        "esri/dijit/PopupTemplate",
        "extras/DetailInfo",
        "extras/ClusterLayer",
        "esri/tasks/query", 
        "esri/tasks/QueryTask",

        "esri/dijit/HomeButton",
        "esri/dijit/Geocoder",
        "esri/dijit/LocateButton",
        "esri/InfoTemplate",
        "esri/dijit/BasemapGallery",

        "esri/dijit/Scalebar",
        "esri/geometry/scaleUtils",
        "esri/dijit/OverviewMap",

        "dijit/layout/BorderContainer", 
        "dijit/layout/ContentPane", 
        "dojo/domReady!"
      ], function(
        parser, ready, arrayUtils, Color, domStyle, query,
        Map, esriRequest, Graphic, Extent,
        SimpleMarkerSymbol, SimpleFillSymbol, PictureMarkerSymbol, ClassBreaksRenderer,
        GraphicsLayer, SpatialReference, Point, webMercatorUtils,
        PopupTemplate, DetailInfo, ClusterLayer, Query, QueryTask,
        HomeButton, Geocoder, LocateButton, InfoTemplate, BasemapGallery,
        Scalebar, scaleUtils, OverviewMap
      ) {
        ready(function() {
          parser.parse();

          var clusterLayer;
          var detailInfo;
          var popupOptions = {
            "markerSymbol": new SimpleMarkerSymbol("circle", 20, null, new Color([0, 0, 0, 0.25])),
            "marginLeft": "20",
            "marginTop": "20"
          };

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

          map.on("mouse-move", showCoordinates);
          map.on("load", function(){
            showCoordinates(map.extent.getCenter())
          });

          // add a graphics layer for geocoding results
          var graphicsLayer = new esri.layers.GraphicsLayer({id: "results"});

          // add feature and graphics layer
          map.addLayer(graphicsLayer);

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

          /* geo locate search with grpahic
           * TO DO style info template
           */
          geocoder = new Geocoder({
            //autoComplete: true, // interferes with displaying a graphic and info window
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




          map.on("load", function() {
            // hide the popup's ZoomTo link as it doesn't make sense for cluster features
            domStyle.set(query("a.action.zoomTo")[0], "display", "none");

            // get the latest sites from http://services2.arcgis.com/Hq6thdRH56GlK76e/ArcGIS/rest/services/MacroinvertebrateWaterMonitoring_Test/FeatureServer/0
            var sites = esriRequest({
              "url": "data/sites.json",
              "handleAs": "json"
            });
            sites.then(addClusters, error);
          });


          function addClusters(resp) {
            var siteInfo = {};
            var wgs = new SpatialReference({
              "wkid": 3857
            });
            siteInfo.data = arrayUtils.map(resp, function(p) {
              var latlng = new  Point(parseFloat(p.attributes.Lon), parseFloat(p.attributes.Lat), wgs);
              var webMercator = webMercatorUtils.geographicToWebMercator(latlng);
              var attributes = {
                "Status": p.attributes.SiteStatus,
                "ObjectID": p.attributes.OBJECTID,
                "Caption": p.attributes.OrgID,
                "SiteID": p.attributes.SiteID,
                "Name": p.attributes.SiteName,
                "Coordinates":  p.attributes.Lon.toFixed(3)+" "+p.attributes.Lat.toFixed(3)+" (Lon/Lat)",
                "SiteNotes": p.attributes.SiteNotes,
                "Elevation": p.attributes.Elevation,
                "SiteLocDesc": p.attributes.SiteLocDesc,
                "Ch93": p.attributes.Ch93Use
              };
              return {
                "x": webMercator.x,
                "y": webMercator.y,
                "attributes": attributes
              };
            });

            // Query fields for secondary query for dates
            var queryTask = new QueryTask("http://services2.arcgis.com/Hq6thdRH56GlK76e/ArcGIS/rest/services/MacroinvertebrateWaterMonitoring_Test/FeatureServer/3");

            var query = new Query();
            //query.outFields = ["SurveyDate"];//SiteStatus","OBJECTID","OrgID","SiteID","SiteName","Lat","Lon"];
            query.returnGeometry = false;

            detailInfo = new DetailInfo({
              "queryTask": queryTask,
              "query": query
            });

            // cluster layer that uses OpenLayers style clustering
            clusterLayer = new ClusterLayer({
              "data": siteInfo.data,
              "distance": 100,
              "id": "clusters",
              "labelColor": "#fff",
              "labelOffset": 10,
              "resolution": map.extent.getWidth() / map.width,
              "singleColor": "#888",
              //"singleTemplate": popupTemplate
              "detailInfo": detailInfo
            });

            var defaultSym = new SimpleMarkerSymbol().setSize(4);
            var renderer = new ClassBreaksRenderer(defaultSym, "clusterCount");

            var picBaseUrl = "../../../img/";
            var one = new PictureMarkerSymbol(picBaseUrl + "neon-yellow-wr.png", 15, 15).setOffset(0, 15);
            var smallest = new PictureMarkerSymbol(picBaseUrl + "light-blue-wr.png", 35, 35).setOffset(0, 15);
            var middle = new PictureMarkerSymbol(picBaseUrl + "blue-wr.png", 40, 40).setOffset(0, 15);
            var big = new PictureMarkerSymbol(picBaseUrl + "dark-blue-wr.png", 45, 45).setOffset(0, 15);
            var bigger = new PictureMarkerSymbol(picBaseUrl + "dark-blue-wr.png", 50, 50).setOffset(0, 15);
            var biggest = new PictureMarkerSymbol(picBaseUrl + "light-gray-wr.png", 55, 55).setOffset(0, 15);
            renderer.addBreak(0, 2, one);
            renderer.addBreak(2, 20, smallest);
            renderer.addBreak(20, 120, middle);
            renderer.addBreak(120, 320, big);
            renderer.addBreak(320, 1001, bigger);
            renderer.addBreak(1001, 7000, biggest);

            clusterLayer.setRenderer(renderer);
            map.addLayer(clusterLayer);

            // close the info window when the map is clicked
            map.on("click", cleanUp);
            // TODO add cleanup for zoom
            // close the info window when esc is pressed
            map.on("key-down", function(e) {
              if (e.keyCode === 27) {
                cleanUp();
              }
            });
          }

          getDetailData = function(objectId) {
            detailInfo.getDetailData();
          }

          addSampleInfo = function(results) {
            detailInfo.addSampleInfo(results);
          }

          function cleanUp() {
            map.infoWindow.hide();
            clusterLayer.clearSingles();
          }

          function error(err) {
            console.log("something failed: ", err);
          }

          // show cluster extents...
          // never called directly but useful from the console 
          window.showExtents = function() {
            var extents = map.getLayer("clusterExtents");
            if ( extents ) {
              map.removeLayer(extents);
            }
            extents = new GraphicsLayer({ id: "clusterExtents" });
            var sym = new SimpleFillSymbol().setColor(new Color([205, 193, 197, 0.5]));

            arrayUtils.forEach(clusterLayer._clusters, function(c, idx) {
              var e = c.attributes.extent;
              extents.add(new Graphic(new Extent(e[0], e[1], e[2], e[3], map.spatialReference), sym));
            }, this);
            map.addLayer(extents, 0);
          }
        });

        /* jequery stuff */
        $(document).ready(function(){
           $('.HomeButton').click(function(){ // hide graphic with geo search result "reset"
              graphicsLayer.hide();
           });
           $('.esriGeocoderReset').click(function(){ // hide graphic with geo search result "reset"
              graphicsLayer.hide();
           });
           $('.LocateButton').click(function(){ // hide graphic with geo search result "reset"
              graphicsLayer.show();
           });
        }); 

      });

      function commaSeparateNumber(val){
          while (/(\d+)(\d{3})/.test(val.toString())){
            val = val.toString().replace(/(\d+)(\d{3})/, '$1'+','+'$2');
          }
          return val;
      }
