define([
  "dojo/Stateful",
  "dojo/_base/declare",
  "dojo/dom",
  "dojo/_base/connect",
  "dojo/dom-class",
  "dojo/_base/json"
], function(
  Stateful, declare, dom, connect, domClass, json
) {
  return declare( [Stateful], {
    //public setter
    cv: null,
    _cvGetter: function(){
      return this.cv;
    },

    _cvSetter: function(value){
      this.cv = value;
    },

    constructor: function(options) {

      cv = "something else";
      console.log(this.cv);
      this._url = options.url;// || "http://gis.carnegiemnh.org/arcgis/rest/services/Macroinvertebrates/MacroinvertebrateWaterMonitoring/MapServer/3";
      
      requestHandle = esri.request({
        "url": this._url,
        "content": {
          "f": "json"
        },
        "callbackParamName": "callback",
      });

      requestHandle.then(this._requestSucceeded, this._requestFailed);
      // this._cv = "nothing";
      // cv = this._cv;

      //this.cv = "something";
      //console.log("CodedValues.js outside of request: "+this.cv);
    },

    _requestSucceeded: function(response, io) {
      var fieldInfo, pad;
      pad = dojo.string.pad;
      //console.log("Succeeded: ", response);
      var fieldsWithDomains = {};
      // loop throught the fields
      dojo.forEach(response.fields, function(field) {
        if ( field.domain ) {
          // use the field name as a key
          //fieldsWithDomains["MI_SamplingMethod"] = field.domain; //"SurveyType" // field.name returns cv for fields that have cv
          fieldsWithDomains[field.name] = field.domain; //"SurveyType" // field.name returns cv for fields that have cv
        }
      });

      //console.log("before");
      //this._cvSetter(fieldsWithDomains.SurveyType.codedValues[0].name);
      //console.log("after");
      //console.log(this._cv);
      console.log("CodedValues.js "+fieldsWithDomains.SurveyType.codedValues[0].name);
    },

    getCodedValues: function(){
      console.log(this._cv);
      return this._cv;
    },

    _requestFailed: function(error, io) {         
      console.log("CV Failed: ", error);
    }
  });
});
