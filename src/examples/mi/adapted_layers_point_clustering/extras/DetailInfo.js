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
      
      this._queryTask = options.queryTask || console.log("Error: the query link seems to be missing, please add a queryTask to the option when creating a ClusterLayer");
        
      this._query = options.query || new Query();
      this._query.returnGeometry = false;

      this._gisServer = "http://gis.carnegiemnh.org/arcgis/rest/services/Macroinvertebrates/MacroinvertebrateWaterMonitoring/MapServer/";
      //this._gisServer = "http://services2.arcgis.com/Hq6thdRH56GlK76e/ArcGIS/rest/services/MacroinvertebrateWaterMonitoring_Test/FeatureServer/";
    
      this._thumbnails = '';
      var _this = this;
      $(document).ready(function(){
          $.getJSON('data/imageThumbnails.json', function(jsonData) {
              _this._thumbnails = jsonData;
              //console.log(JSON.stringify(this._thumbnails));
              //this._getThumbnails(jsonData);
          });
      });

    },

    showDetailInfoDialog: function(cluster, status, obID, orgID, siteID, siteName, coordinates, siteNotes, elevation, siteLocDesc, ch93){       
      // set up dialog and accordion 
      //$( "#dialog" ).dialog({ height: 570 });
      $( "#dialog" ).dialog({
        //height: 570,
        resize: function( event, ui ) {
          $(".ui-accordion-content").css("height", ui.size.height-140 +"px");
        }
        //position: { my: "top", at: "bottom", of: "#header" }
      });
      $('.ui-dialog :button').blur();

      $( "#accordion" ).accordion();

      // custom close button for info dialog (- )customPopup) workaround
      $(".ui-dialog-titlebar-close").css('background-image', 'url(../../../img/close.png)');
      $(".ui-dialog-titlebar-close").css('border', 'none');
      $(".ui-dialog-titlebar-close").css('width','20');
      $(".ui-dialog-titlebar-close").css('height','20');
      $(".ui-dialog-titlebar-close").css('background-repeat','no-repeat');
      $(".ui-dialog-titlebar-close").css('background-position','center center');
      $('.ui-icon').css('display','none');

      this._showClusterInfo(cluster);
      //populates tabs when site selected from map
      if(siteID != null) this._showSiteInfo(status, obID, orgID, siteID, coordinates, siteNotes, elevation, siteLocDesc, ch93);
      if(siteName != null) this._showMacroinvertebrates(obID, siteName);

      // $( "#macro-helper" ).remove();
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

    _showMacroinvertebrates: function(obID, siteName){

      //change heading of Site info when new site is selected
      document.getElementById("siteInfo").innerHTML="Site Info: " + siteName;

      

      var dates = '<div class="date-content"><select id="dates" onchange="getDetailData();"><option id="dateSelector"> Select a date </option></select><div id="specimen"><ul></ul></div></div>';
      var info = '<div id="sampleInfo"></div>';
      //TODO
      //SurveyType
      //SurveyOther

      //MI_SamplingMethod
      //MI_OtherMethods -> might be null

      //MI_SampleComments -> might be null

      // add heading
      // Specimen     Count

      var url='http://gis.carnegiemnh.org/arcgis/rest/services/Macroinvertebrates/MacroinvertebrateWaterMonitoring/MapServer/0/queryRelatedRecords?objectIds='+obID+'&relationshipId=0&outFields=DTI%2CSurveyDate%2CSurveyType%2CSurveyOther%2CMI_SamplingMethod%2CMI_OtherMethod%2CMI_SampleComments&definitionExpression=&returnGeometry=false&maxAllowableOffset=&geometryPrecision=&outSR=&returnZ=false&returnM=false&gdbVersion=&f=pjson&callback=addSampleInfo';
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

      for (var i=0, il= results.relatedRecordGroups[0].relatedRecords.length; i<il; i++) {

          var attributes = results.relatedRecordGroups[0].relatedRecords[i].attributes;
        
          // date values
          d = new Date(parseInt(attributes.SurveyDate+14400000));
          month =  parseInt(d.getMonth())+parseInt(1);
          if (month<=9) month = "0"+month;
          day = d.getDate();
          if (day <= 9) day = "0"+day;
          $("#dates").append("<option id='date-values' value='"+attributes.DTI+"'>"  + day + "/" + month + "/" + d.getFullYear() + " </option>");

          //sample info
          //$("#sampleInfo").append('<table> <tr><td>SurveyType</td><td></td></tr> <tr><td>MI_SamplingMethod</td><td></td></tr> <tr><td>MI_SampleComments</td><td></td></tr> </table>');
      }

      $("#dateSelector").remove();
      //show default sample info without having to select from the drop down
      getDetailData();
    },

    _showSiteInfo: function(status, obID, orgID, siteID, coordinates, siteNotes, elevation, siteLocDesc, ch93){

      var siteStatus = "Inactive";
      if (status == 2) siteStatus = "Active";

      if (siteLocDesc == null) siteLocDesc = "-";
      if (siteNotes == null) siteNotes = "-";
      //0 from json
      //OrgID -> fields[1].name
      //orgid name -> fields[1].domain.codedValues[0].name
      
      $( ".siteInfo" ).append('<div id="siteInfo-content"><table><tr><td>Organization</td><td>'+orgID+'</td></tr><tr><td>Coordinates</td><td>'+coordinates+'</td></tr><tr><td>Elevation</td><td>'+elevation.toFixed(2)+'m</td></tr><tr><td>Notes</td><td>'+siteNotes+'</td></tr><tr><td>Site Status</td><td>'+siteStatus+'</td></tr><tr><td>Description</td><td>'+siteLocDesc+'</td></tr><tr><td>Ch93 Use</td><td>'+ch93+'</td></tr></table></div>');
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
      
      tsnQuery.where = "DTI = '" + document.getElementById("dates").value + "'"; //get entries by DTI from date selection
      //console.log(document.getElementById("dates").value);
      //console.log(tsnQuery.where);
      tsnQuery.outFields = ["TSN, SpecimenCount"];
      tsnQuery.orderByFields = ["SpecimenCount"];

      var nameQuery = new Query();
      var nameQueryTask = new QueryTask(this._gisServer + "4");//http://services2.arcgis.com/Hq6thdRH56GlK76e/ArcGIS/rest/services/MacroinvertebrateWaterMonitoring_Test/FeatureServer/4");

      var tsns = new Array(); // save all tsns in array for output
      var scounts = new Array(); // save all specimen counts in array for output

      // check if list is not empty
      if(document.getElementById("dates").value.localeCompare("Select a date") != 0 ){

      $("#specimen ul").append('<tr style="list-style:none;" class="specListHeading"><td>Specimen</td><td>Count</td></tr>'); 
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
                      $("#specimen ul").append('<tr style="list-style:none"; class="specList"><td><a href="' + externalLink+ '" onmouseover="document.getElementById(\'place-holder-1\').src=\' ' + imageLink+ ' \';" onmouseout="document.getElementById(\'place-holder-1\').src=\'../../../img/placeholder.png\';" target="blank" > ' + speciesName + '<img class="thumbsImage" src="../../../img/placeholder.png" id="place-holder-1" /></a></td><td>' + scounts[j] + '</td></tr>');
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
        }, function(noResults){ // error callback
          $("#specimen ul").append('<li style="list-style:none;">No Results</li>');   
        });
      }
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