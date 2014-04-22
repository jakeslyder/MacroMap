define([
  "dojo/_base/declare",
  "esri/tasks/query", 
  "esri/tasks/QueryTask",
  "esri/layers/GraphicsLayer",
  "esri/geometry/Point",
  "esri/graphic",
], function (
  declare,
  Query, QueryTask, GraphicsLayer, Point, Graphic
) {
  return declare( [GraphicsLayer], {
    constructor: function(options) {
      
      // this._queryTask = options.queryTask || console.log("Error: the query link seems to be missing, please add a queryTask to the option when creating a ClusterLayer");        
      // this._query = options.query || new Query();
      // this._query.returnGeometry = false;

      //options
      this._gisServer = options.gisServer;
      this._organizations = options.organizations;
      this._point = options.highlightPoint;
      this._highlight = options.highlightGraphic;

      this._sampleInfo = new Array();

      this._thumbnails = '';
      var _this = this;
      $(document).ready(function(){
          $.getJSON('data/imageThumbnails.json', function(jsonData) {
              _this._thumbnails = jsonData;
          });
      });

      this._DTI = null;
      this._previousId = "";
    },

    showDetailInfoDialog: function(cluster, status, obID, orgID, siteID, siteName, coordinates, siteNotes, elevation, siteLocDesc, ch93){       
      // show up dialog and accordion 

      $( ".ui-dialog" ).show();
      $( "#dialog" ).dialog({
        resize: function( event, ui ) {
          $(".ui-accordion-content").css("height", ui.size.height-140 +"px");
        }
      });

      $( ".ui-dialog :button" ).blur();

      $( "#accordion" ).accordion();

      this._showClusterInfo(cluster);
      //populates tabs when site selected from map
      if(siteID != null) this._showSiteInfo(status, obID, orgID, siteID, coordinates, siteNotes, elevation, siteLocDesc, ch93);
      if(siteName != null) this._showMacroinvertebrates(obID, siteName);
    },

    _requestFailed: function(error, io) {         
      console.log("CV Failed: ", error);
    },

    _showClusterInfo: function(c){

      var data = JSON.parse(JSON.stringify(c));

      //TODO
      //Select a site from this list
      
      //list all sites (objectid)
      var selectedSite = "";
      var content = '<div class="cluster-content"><ul>';
      for ( var i = 0, il = c.length; i < il; i++) {
        content = content + '<li><a href="" class="site-selected" id="'+ i +'">'+ data[i].attributes.Name +'</a></li>';
      }
      content = content + "</ul></div>";

      $( ".cluster-content").remove();
      $( ".cluster-info" ).append(content);

      // get id from last list li hover
      var _this = this;
      var obID = data[0].attributes;
      var data = JSON.parse(JSON.stringify(c));
      $( ".site-selected" ).hover(
        function() {
          obID = c[this.id].attributes.ObjectID;
          lastSiteInList = this.id;
          // console.log(c[this.id].attributes);
          // var res = c[this.id].attributes.Coordinates.split(" ");
          // _this._point.setLongitude(res[0]);
          // _this._point.setLatitude(res[1]);
          // _this._highlight.getLayer().redraw();
        }
      );


      $( ".site-selected" ).click(function(event) {
        $( "#accordion" ).accordion({ active: 2});
          var site = c[this.id].attributes;
          $( "#siteInfo-content" ).remove();
          _this._showSiteInfo(site.Status, site.ObjectID, site.Caption, site.SiteID, site.Coordinates, site.SiteNotes, site.Elevation, site.SiteLocDesc, site.Ch93);
          _this._showMacroinvertebrates(obID, site.Name);

          //update highlight graphic
          var res = site.Coordinates.split(" ");
          _this._point.setLongitude(res[0]);
          _this._point.setLatitude(res[1]);
          _this._highlight.show();
          _this._highlight.getLayer().redraw();

          // select li in list
          $("#"+_this._previousId).css('color', '#fff');
          $("#"+this.id).css('color', '#0099c1');
          _this._previousId = this.id;

        $("#selectedSite").remove();
      });

    },

    _showSiteInfo: function(status, obID, orgID, siteID, coordinates, siteNotes, elevation, siteLocDesc, ch93){

      var siteStatus = "Inactive";
      if (status == 2) siteStatus = "Active";

      if (siteLocDesc == null) siteLocDesc = "-";
      if (siteNotes == null) siteNotes = "-";

      var orgIDname;
      
      for(var i = 0; i < this._organizations.length; i++){
          if( this._organizations[i].code.toLowerCase() == orgID.toLowerCase() ){
            orgIDname = this._organizations[i].name;
          }
      }
      
      $( ".siteInfo" ).append('<div id="siteInfo-content"><table><tr><td>Organization</td><td>'+orgIDname+'</td></tr><tr><td>Coordinates</td><td>'+coordinates+'</td></tr><tr><td>Elevation</td><td>'+elevation.toFixed(2)+'m</td></tr><tr><td>Notes</td><td>'+siteNotes+'</td></tr><tr><td>Site Status</td><td>'+siteStatus+'</td></tr><tr><td>Description</td><td>'+siteLocDesc+'</td></tr><tr><td>Ch93 Use</td><td>'+ch93+'</td></tr></table></div>');
    },

    _showMacroinvertebrates: function(obID, siteName){

      //change heading of Site info when new site is selected
      document.getElementById("siteInfo").innerHTML="Site Info: " + siteName;

      var dates = '<div class="date-content"></div>';
      
      //get related records via JSON hhtp request
      var url = this._gisServer+'0/queryRelatedRecords?objectIds='+obID+'&relationshipId=0&outFields=DTI%2CSurveyDate%2CSurveyType%2CSurveyOther%2CMI_SamplingMethod%2CMI_OtherMethod%2CMI_SampleComments&definitionExpression=&returnGeometry=false&maxAllowableOffset=&geometryPrecision=&outSR=&returnZ=false&returnM=false&gdbVersion=&f=pjson&callback=addSampleInfo';
      var script = document.createElement('script');
      script.type = "text/javascript";
      script.src= url;
      document.getElementsByTagName('head')[0].appendChild(script);

      $( "#dates" ).remove();
      $( "#specimen" ).remove();
      $( ".date-content").remove();
      $( "#single-date" ).remove();
      $( ".date" ).append(dates);
    },

    addSampleInfo: function(results, codedValues) {
      
      var s = "";
      var d = new Date(0); // The 0 there is the key, which sets the date to the epoch
      var day = "";
      var month = "";
      var opt = "";

      this._DTI = null;

      var sampleInfo = new Array();
      var dateSpecificSampleInfo;// = new Object();

        if(results.relatedRecordGroups[0].relatedRecords.length > 1){

          $(".date-content").append('<select id="dates" onchange="getDetailData();"><option id="dateSelector"> Select a date </option></select><div id="sampleInfo"></div><div id="specimen"><ul></ul></div>');

          for (var i=0, il= results.relatedRecordGroups[0].relatedRecords.length; i<il; i++) {

              //console.log(il);
              var attributes = results.relatedRecordGroups[0].relatedRecords[i].attributes;
            
              // date values
              d = new Date(parseInt(attributes.SurveyDate+14400000));
              month =  parseInt(d.getMonth())+parseInt(1);
              if (month<=9) month = "0"+month;
              day = d.getDate();
              if (day <= 9) day = "0"+day;
              $("#dates").append("<option id='date-values' value='"+attributes.DTI+"'>"  + day + "/" + month + "/" + d.getFullYear() + " </option>");

              
              // add sample info for each date
              dateSpecificSampleInfo = new Object();
              dateSpecificSampleInfo.DTI = attributes.DTI;
              dateSpecificSampleInfo.SurveyType = codedValues.SurveyType.codedValues[attributes.SurveyType-1].name;//+attributes.SurveyType;
              dateSpecificSampleInfo.MI_SamplingMethod = codedValues.MI_SamplingMethod.codedValues[attributes.MI_SamplingMethod-1].name;//+attributes.MI_SamplingMethod;
              if (attributes.MI_SampleComments == null) {
                dateSpecificSampleInfo.MI_SampleComments = "-";
              } else {
                dateSpecificSampleInfo.MI_SampleComments = attributes.MI_SampleComments;
              }
              sampleInfo[i] = dateSpecificSampleInfo;
          }

          $("#dateSelector").remove();

        } else {

            var attributes = results.relatedRecordGroups[0].relatedRecords[0].attributes;

            // console.log(JSON.stringify(results.relatedRecordGroups[0].relatedRecords));
            // console.log(attributes.DTI);

            // date values
            d = new Date(parseInt(attributes.SurveyDate+14400000));
            month =  parseInt(d.getMonth())+parseInt(1);
            if (month<=9) month = "0"+month;
            day = d.getDate();
            if (day <= 9) day = "0"+day;

            $(".date-content").append( "<div id='single-date'>" + day + "/" + month + "/" + d.getFullYear() + '<br /><br /></div><div id="specimen"><ul></ul></div>');
            
            this._DTI = attributes.DTI; 

            //console.log(attributes.SurveyType +"  "+JSON.stringify(codedValues.SurveyType.codedValues));
            $("#single-date").append('<div id="sampleInfo" style="padding-left:0;">Survey Type: '+codedValues.SurveyType.codedValues[attributes.SurveyType-1].name+'<br />Sampling Method: '+codedValues.MI_SamplingMethod.codedValues[attributes.MI_SamplingMethod-1].name+'<br />Comments: '+attributes.MI_SampleComments+'</div>');
        }

       //end request for coded values

      //generate and set sample specific site info so it can be displayed when dates are selected
      this._sampleInfo = sampleInfo;

      //show default sample info without having to select from the drop down
      getDetailData();
    },


    getDetailData: function(){

      var thumbnails = this._thumbnails;
      
      // remove all li from id specimen to dispolay new data set
      $('#specimen tr').remove();
      // remove select date statement
      $('#dateSelector').remove();

      var speciesname, tsn, tsnQueryString = "";
      
      var tsnQuery = new Query();
      var tsnQueryTask = new QueryTask(this._gisServer + "2"); //http://services2.arcgis.com/Hq6thdRH56GlK76e/ArcGIS/rest/services/MacroinvertebrateWaterMonitoring_Test/FeatureServer/2");
      
      if(this._DTI != null) {
        //console.log("single date");
        tsnQuery.where = "DTI = '" + this._DTI + "'";
        //console.log("DTI in getDetailData: "+this._DTI);
      } else {
        //console.log("dropdown");
        tsnQuery.where = "DTI = '" + document.getElementById("dates").value + "'"; //get entries by DTI from date selection
        //console.log(tsnQuery.where);

        //sample info
        var selectedDateInList = 0;
        for(var s=0; s < this._sampleInfo.length; s++){
          if(this._sampleInfo[s].DTI == document.getElementById("dates").value){
            selectedDateInList = s;
          }
        }
        $("#sampleInfo").append('<div id="sample-info"><br />SurveyType: '+this._sampleInfo[selectedDateInList].SurveyType+'<br />Sampling Method: '+this._sampleInfo[selectedDateInList].MI_SamplingMethod+'<br />Comments: '+this._sampleInfo[selectedDateInList].MI_SampleComments+'</div>');
      }
      
      tsnQuery.outFields = ["TSN, SpecimenCount"];
      tsnQuery.orderByFields = ["SpecimenCount DESC"];

      var nameQuery = new Query();
      var nameQueryTask = new QueryTask(this._gisServer + "4");//http://services2.arcgis.com/Hq6thdRH56GlK76e/ArcGIS/rest/services/MacroinvertebrateWaterMonitoring_Test/FeatureServer/4");

      var tsns = new Array(); // save all tsns in array for output
      var scounts = new Array(); // save all specimen counts in array for output

      // check if a date is selected
      //if(document.getElementById("dates").value.localeCompare("Select a date") != 0 ){

      $("#specimen ul").append('<tr style="list-style:none;" class="specListHeading"><td>Specimen</td><td>Count</td></tr>'); 
      
      // get tsn by selected date
      tsnQueryTask.execute(tsnQuery, function(tsnData){
        //console.log('just in query');
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
          nameQuery.outFields = ["SciName,TSN"];

          if(nameQuery.where){
            nameQueryTask.execute(nameQuery, function(speciesList){

              if(speciesList.features.length > 0){

                for(var j=0; j < tsns.length; j++){

                  speciesName = "";

                  for(var t=0; t < speciesList.features.length; t++){
                      if(tsns[j] == JSON.stringify(speciesList.features[t].attributes.TSN)){
                        speciesName = JSON.stringify(speciesList.features[t].attributes.SciName);
                        speciesName = speciesName.replace(/\"/g,"");
                      }
                  }

                  var speciesLink = speciesName.toLowerCase().replace(/ /g,"/");

                  var onMacroOrg = false;
                  var thumbs = "";
                  var imageLink = "";
                  for (var t=0; t<thumbnails.length; t++) {
                    //console.log(tsns[j] + "==" + thumbnails[t].url + "?");
                     //if (tsns[j] == thumbnails[t].url) { 
                    thumbs = thumbnails[t].Order+" "+thumbnails[t].Family+" "+thumbnails[t].Genera;
                     if (speciesName.toLowerCase() == thumbs.toLowerCase()) {
                       onMacroOrg = true;
                       //console.log("get link from macro.org");
                       imageLink = "http://macroinvertebrates.org/img/thumbnails/gigapans/viewer/" + thumbnails[t].url + ".jpg";
                     }
                  }
                    if (onMacroOrg == true) {
                      // link to macroinvertebrates.org
                      $("#specimen ul").append('<tr style="list-style:none"; class="specList"><td><a href="http://macroinvertebrates.org/#/' + speciesLink+ '" onmouseover="document.getElementById(\'place-holder-1\').src=\' ' + imageLink+ ' \';" onmouseout="document.getElementById(\'place-holder-1\').src=\'img/placeholder.png\';" target="blank" > ' + speciesName + '<img class="thumbsImage" src="img/placeholder.png" id="place-holder-1" /></a></td><td>' + scounts[j] + '</td></tr>');
                      // var currentMousePos = { x: -1, y: -1 };
                      // $(document).mousemove(function(event) {
                      //     currentMousePos.x = event.pageX;
                      //     currentMousePos.y = event.pageY;
                      //     console.log(event.pageX+"/"+event.pageX);    
                      // }); 
                      $( ".thumbsImage" ).css('top', '0px');
                      $( ".thumbsImage" ).css('right', '15px');                
                    } else {
                      // link to ITIS with tsn
                      //console.log(tsns[j]);
                      $("#specimen ul").append('<tr style="list-style:none;" class="specList"><td><a href="http://www.itis.gov/servlet/SingleRpt/SingleRpt?search_topic=TSN&search_value=' + tsns[j] + '" target="blank"> ' + speciesName + '</a></td><td>' + " " + scounts[j] + " " + '</td></tr>'); 
                    }
                  // backup link to macroinvertebrates 
                  // $("#specimen ul").append('<tr style="list-style:none;" class="specList"><td><a href="http://macroinvertebrates.org/#/' + speciesLink + '" target="blank" > ' + speciesName + '</a></td><td>' + scounts[j] + '</td></tr>');
                                  
                }
              } else {
                $("#specimen ul").append('<li style="list-style:none;">There was no data collected</li>');
              }

            });
          } else {
              $("#specimen ul").append('<li style="list-style:none;">No specimens available</li>');
          }
        }, function(noResults){ // error callback for tsnQueryTask.execute()
          $("#specimen ul").append('<li style="list-style:none;">No Results</li>');   
        });
      //}
    }, //end of getDetailData()

    _getThumbnails: function() {
      $(document).ready(function(){
          $.getJSON('data/imageThumbnails.json', function(json) {
              //console.log(json);
          });
      });
      //console.log(JSON.stringify(data));
    },

    deleteContent: function() {

      $( "#specimen" ).remove();
      $( "#sample-info" ).remove(); 
      $( "#dates" ).remove();
      $( ".cluster-content").remove();
      $( "#siteInfo-content" ).remove();
      $( "#single-date" ).remove();
      document.getElementById("siteInfo").innerHTML="Site Info";
    },

    clearSampleInfo: function() {
       $( "#sample-info" ).remove(); 
    },

    debug: function(){
      console.log("Calling function in showDetailInfo");
    }
  });
    
});