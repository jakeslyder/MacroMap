define([
  "dojo/_base/declare",
  "esri/tasks/query", 
  "esri/tasks/QueryTask",
  "esri/layers/GraphicsLayer"
], function (
  declare,
  Query, QueryTask, GraphicsLayer
) {
  return declare( [GraphicsLayer], {
    constructor: function(options) {
      
      // this._queryTask = options.queryTask || console.log("Error: the query link seems to be missing, please add a queryTask to the option when creating a ClusterLayer");
        
      // this._query = options.query || new Query();
      // this._query.returnGeometry = false;

      this._organizations = options.organizations;

      this._gisServer = options.server || "http://services2.arcgis.com/Hq6thdRH56GlK76e/ArcGIS/rest/services/MacroinvertebrateWaterMonitoring_Test/FeatureServer/";

      this._sampleInfo = new Array();

      this._thumbnails = '';
      var _this = this;
      $(document).ready(function(){
          $.getJSON('data/imageThumbnails.json', function(jsonData) {
              _this._thumbnails = jsonData;
          });
      });

      this._DTI = null;

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

      // $( ".date" ).append("<div id='macro-helper'>Select a site from the map or in the tab titled: Select a Site</div>");
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

      var _this = this;
      var obID = data[0].attributes;
      var data = JSON.parse(JSON.stringify(c));
      $( ".site-selected" ).hover(
        function() {
          obID = c[this.id].attributes.ObjectID;
        }
      );

      $( ".site-selected" ).click(function(event) {
        $( "#accordion" ).accordion({ active: 2});
          var site = c[this.id].attributes;
          $( "#siteInfo-content" ).remove();
          _this._showSiteInfo(site.Status, site.ObjectID, site.Caption, site.SiteID, site.Coordinates, site.SiteNotes, site.Elevation, site.SiteLocDesc, site.Ch93);
          _this._showMacroinvertebrates(obID, site.Name);
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
      //var dates = '<div class="date-content"><select id="dates" onchange="getDetailData();"><option id="dateSelector"> Select a date </option></select><div id="specimen"><ul></ul></div></div>';
      var info = '<div id="sampleInfo"></div>';

      var url = this._gisServer+'0/queryRelatedRecords?objectIds='+obID+'&relationshipId=0&outFields=DTI%2CSurveyDate%2CSurveyType%2CSurveyOther%2CMI_SamplingMethod%2CMI_OtherMethod%2CMI_SampleComments&definitionExpression=&returnGeometry=false&maxAllowableOffset=&geometryPrecision=&outSR=&returnZ=false&returnM=false&gdbVersion=&f=pjson&callback=addSampleInfo';
      var s = document.createElement('script');
      s.src= url;
      document.getElementsByTagName('head')[0].appendChild(s);
      
      $( "#dates" ).remove();
      $( "#specimen" ).remove();
      $( ".date-content").remove();
      $( "#sampleInfo" ).remove();
      $( ".date" ).append(dates);
      $( ".date" ).append(info);
    },

    addSampleInfo: function(results) {
      var s = "";
      var d = new Date(0); // The 0 there is the key, which sets the date to the epoch
      var day = "";
      var month = "";
      var opt = "";

      this._DTI = null;

      var sampleInfo = new Array();
      var dateSpecificSampleInfo = new Object();

      if(results.relatedRecordGroups[0].relatedRecords.length > 1){

        $(".date-content").append('<select id="dates" onchange="getDetailData();"><option id="dateSelector"> Select a date </option></select><div id="specimen"><ul></ul></div>');

        for (var i=0, il= results.relatedRecordGroups[0].relatedRecords.length; i<il; i++) {

            var attributes = results.relatedRecordGroups[0].relatedRecords[i].attributes;
          
            // date values
            d = new Date(parseInt(attributes.SurveyDate+14400000));
            month =  parseInt(d.getMonth())+parseInt(1);
            if (month<=9) month = "0"+month;
            day = d.getDate();
            if (day <= 9) day = "0"+day;
            $("#dates").append("<option id='date-values' value='"+attributes.DTI+"'>"  + day + "/" + month + "/" + d.getFullYear() + " </option>");

            // dateSpecificSampleInfo.SurveyType = attributes.SurveyType;
            // dateSpecificSampleInfo.MI_SamplingMethod = attributes.MI_SamplingMethod;
            // dateSpecificSampleInfo.MI_SampleComments = attributes.MI_SampleComments;
            // sampleInfo[i] = dateSpecificSampleInfo;
        }

        $("#dateSelector").remove();

      } else {

          var attributes = results.relatedRecordGroups[0].relatedRecords[0].attributes;
          
          // date values
          d = new Date(parseInt(attributes.SurveyDate+14400000));
          month =  parseInt(d.getMonth())+parseInt(1);
          if (month<=9) month = "0"+month;
          day = d.getDate();
          if (day <= 9) day = "0"+day;

          $(".date-content").append( "<div id='single-date'>" + day + "/" + month + "/" + d.getFullYear() + '</div><div id="specimen"><ul></ul></div>');
          this._DTI = attributes.DTI; 
      }
      //generate and set sample specific site info so it can be displayed when dates are selected
      //this._setDateSpecificSampleInfo(sampleInfo);
      // console.log(sampleInfo);
      //this._sampleInfo = sampleInfo;
      //show default sample info without having to select from the drop down
      getDetailData();
    },

    // _setDateSpecificSampleInfo: function(sampleInfo){
    //   //console.log(sampleInfo[0].SurveyType);
    //   this._sampleInfo = sampleInfo;
    //   console.log(this._sampleInfo);
    // },

    // _getDateSpecificSampleInfo: function(){
    //   return this._sampleInfo
    // },


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
        tsnQuery.where = "DTI = '" + this._DTI + "'";
      } else {
        tsnQuery.where = "DTI = '" + document.getElementById("dates").value + "'"; //get entries by DTI from date selection
      }
      //console.log(document.getElementById("dates").value);
      //console.log(tsnQuery.where);
      tsnQuery.outFields = ["TSN, SpecimenCount"];
      tsnQuery.orderByFields = ["SpecimenCount"];

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
          nameQuery.outFields = ["SciName"];

          if(nameQuery.where){
            nameQueryTask.execute(nameQuery, function(speciesList){

              if(speciesList.features.length > 0){

                //sample info
                //console.log(this._sampleInfo);
                //$("#sampleInfo").append('<table><tr><td>SurveyType</td><td></td></tr> <tr><td>MI_SamplingMethod</td><td></td></tr> <tr><td>MI_SampleComments</td><td></td></tr> </table>');

                for(var j=speciesList.features.length-1; j >= 0; j--){
                  speciesName = JSON.stringify(speciesList.features[j].attributes.SciName);
                  speciesName = speciesName.replace(/\"/g,"");
                  var speciesLink = speciesName.toLowerCase().replace(/ /g,"/");

                  var externalLink = "http://macroinvertebrates.org/#/" + speciesLink;

                  // console.log(thumbnails[0].url);
                  // console.log("thumbnail image: " + thumbnails[0].url);
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
                      $("#specimen ul").append('<tr style="list-style:none"; class="specList"><td><a href="' + externalLink+ '" onmouseover="document.getElementById(\'place-holder-1\').src=\' ' + imageLink+ ' \';" onmouseout="document.getElementById(\'place-holder-1\').src=\'img/placeholder.png\';" target="blank" > ' + speciesName + '<img class="thumbsImage" src="img/placeholder.png" id="place-holder-1" /></a></td><td>' + scounts[j] + '</td></tr>');
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
    },

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
      $( "#dates" ).remove();
      $( ".cluster-content").remove();
      $( "#siteInfo-content" ).remove();
      document.getElementById("siteInfo").innerHTML="Site Info";
    },

    debug: function(){
      console.log("Calling function in showDetailInfo");
    }
  });
    
});