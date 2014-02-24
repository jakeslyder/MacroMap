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

    showDetailInfoDialog: function(c, obID){
                  
      // set up dialog and accordion 
      //$( "#dialog" ).dialog({ height: 570 });
      $( "#dialog" ).dialog({
        //height: 570,
        resize: function( event, ui ) {
          $(".ui-accordion-content").css("height", ui.size.height-135 +"px");
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

      this._showClusterInfo(c);
      this._showMacroinvertebrates(obID);

      // $( "#macro-helper" ).remove();
      // $( ".date" ).append("<div id='macro-helper'>Select a site from the map or in the tab titled: Select a Site</div>");
    },

    _showClusterInfo: function(c){

      var data = JSON.parse(JSON.stringify(c));

      //Select a site from this list
      
      //list all sites (objectid)
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
        _this._showMacroinvertebrates(obID);
        $("#selectedSite").remove();
      });

    },

    _showMacroinvertebrates: function(obID){

      //SurveyType
      //SurveyOther

      //MI_SamplingMethod
      //MI_OtherMethods -> might be null

      //MI_SampleComments -> might be null

      // Specimen     Count
      
      var content = '<div class="date-content"><select id="dates" onchange="getDetailData();"><option id="dateSelector"> Select a date </option></select><div id="specimen"><ul></ul></div></div>';
      
      this._query.where = "OBJECTID =" + obID;
      this._query.outFields = ["SurveyDate,DTI"];
      this._queryTask.execute(this._query, this._addDate); // adds dates from collections site to a select drop down stored in the content variable

      $( "#dates" ).remove();
      $( "#specimen" ).remove();
      $( ".date-content").remove();
      $( ".date" ).append(content);
      //$( "#macro-helper" ).remove();
    },

    _addDate: function(results) {
      var s = "";
      var d = new Date(0); // The 0 there is the key, which sets the date to the epoch
      var day = "";
      var month = "";
      var opt = "";
      for (var i=0, il=results.features.length; i<il; i++) {
        var featureAttributes = results.features[i].attributes;
          //console.log(results.features[i].attributes.SurveyDate);
          d = new Date(parseInt(results.features[i].attributes.SurveyDate+14400000));
          month =  parseInt(d.getMonth())+parseInt(1);
          if (month<=9) month = "0"+month;
          day = d.getDate();
          if (day <= 9) day = "0"+day;
          $("#dates").append("<option id='date-values' value='"+results.features[i].attributes.DTI+"'>"  + day + "/" + month + "/" + d.getFullYear() + " </option>");
      }

      $("#dateSelector").remove();
      this.getDetailData();
    },

    _siteDetails: function(){


      //Site Info: *add Site name* //SiteName

      // 0 from json
      //OrgID -> fields[1].name
      //orgid name -> fields[1].domain.codedValues[0].name

      //SiteLocDesc
      //SiteStatus
      //SiteNotes
      //Lat / Lon / Elevation(in meters) (show as coordinates)
      // Ch93Use: (Ch. 93 Designated Use)

    },

    getDetailData: function(){

      var thumbnails = this._thumbnails;
      
      // remove all li from id specimen to dispolay new data set
      $('#specimen ul > li').remove();
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

                  var externalLink = "http://macroinvertebrates.org/#/" + speciesLink;

                  // console.log(thumbnails[0].url);
                  // console.log("thumbnail image: " + thumbnails[0].url);
                  var onMacroOrg = false;
                  var thumbs = "";
                  var imageLink = "";
                  //console.log(speciesName);
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
                      $("#specimen ul").append('<tr style="list-style:none"; class="specList"><td><a href="' + externalLink+ '" onmouseover="document.getElementById(\'place-holder-1\').src=\' ' + imageLink+ ' \';" onmouseout="document.getElementById(\'place-holder-1\').src=\'../../../img/placeholder.png\';" target="blank" > ' + speciesName + '<img src="../../../img/placeholder.png" id="place-holder-1" /></a></td><td>' + scounts[j] + '</td></tr>');
                      //console.log("building link to macroinvertebrates");
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
              console.log(json);
          });
      });
      //console.log(JSON.stringify(data));
    },

    deleteContent: function() {

      $( "#specimen" ).remove();
      $( "#dates" ).remove();
      $( ".cluster-content").remove();
    },

    debug: function(){
      console.log("Calling function in showDetailInfo");
    }
  });
    
});