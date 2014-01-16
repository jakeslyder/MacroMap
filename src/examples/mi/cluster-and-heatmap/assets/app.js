//original
// var xmax_opt = -13580717.688105522,xmin_opt = -13678557.084310414,ymax_opt = 4567952.093497927,ymin_opt = 4517427.217801494;
// var featureLayerLink = "http://services.arcgis.com/6DIQcwlPy8knb6sg/ArcGIS/rest/services/SFPD_Districts/FeatureServer/0";

//macroinvertebrates
var xmax_opt = -8315224.56786581,xmin_opt = -8971295.16637249,ymax_opt = 5200183.78999235,ymin_opt = 4792660.22415386;
var featureLayerLink = "http://services2.arcgis.com/Hq6thdRH56GlK76e/ArcGIS/rest/services/MacroinvertebrateWaterMonitoring_Test/FeatureServer/0";



function init(){
	"use strict",debug("Inside app.init"),dojo.byId("centerDiv_options").style.visibility="",dojo.byId("centerDiv_map").style.visibility="";
	var a={markerSymbol:new esri.symbol.SimpleMarkerSymbol("circle",1,null,new dojo.Color([0,0,0,.25])),marginLeft:"20",marginTop:"20"},
		b=new esri.dijit.Popup(a,dojo.create("div"));//,
		// c=[	{level:11,resolution:76.4370282850732,scale:288895.277144},
		// 	{level:12,resolution:38.2185141425366,scale:144447.638572},
		// 	{level:4,resolution:19.1092570712683,scale:72223.819286},
		// 	{level:14,resolution:9.55462853563415,scale:36111.909643},
		// 	{level:15,resolution:4.77731426794937,scale:18055.954822},
		// 	{level:16,resolution:2.38865713397468,scale:9027.977411}
		// ];
		//original
		//initialExtent=new esri.geometry.Extent({xmax:-13580717.688105522,xmin:-13678557.084310414,ymax:4567952.093497927,ymin:4517427.217801494,spatialReference:{wkid:102100}}),
		initialExtent=new esri.geometry.Extent({xmax:xmax_opt,xmin:xmin_opt,ymax:ymax_opt,ymin:ymin_opt,spatialReference:{wkid:102100}}),
		map=new esri.Map("centerDiv_map",{extent:initialExtent,fitExtent:!1,infoWindow:b,force3DTransforms:!1,navigationMode:"classic"/*,lods:c*/,wrapAround180:!0}),
		dojo.connect(map,"onUpdateStart",showLoadingImage),
		dojo.connect(map,"onUpdateEnd",hideLoadingimage),
		dojo.connect(map,"onLoad",function(){
			dojo.connect(dijit.byId("centerDiv_map"),"resize",map,map.resize),
			dojo.connect(map,"onMouseMove",showCoords),
			dojo.connect(map,"onExtentChange",onMapExtentChange),
			onMapExtentChange(),
			showCoords(map.extent.getCenter())
		});
	var d="http://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer";
	basemapLayer=new esri.layers.ArcGISTiledMapServiceLayer(d,{id:"basemapLayer"}),
	map.addLayer(basemapLayer),
	setTimeout(afterInit,200),
	setTimeout(initCrimeLayer,200),
	dojo.connect(map,"onLayersAddResult",function(){debug("onLayersAddResult event")})
}

function afterInit(){
	debug("### Inside afterInit ###");
	// make new feature layer and add it to the map
	//var a="http://services.arcgis.com/6DIQcwlPy8knb6sg/ArcGIS/rest/services/SFPD_Districts/FeatureServer/0";
	var a = featureLayerLink;
	districtsLayer=new esri.layers.FeatureLayer(a,{mode:esri.layers.FeatureLayer.MODE_SNAPSHOT,id:"SFPD_Districts_FeatureLayer",visible:!1,displayOnPan:!0,outFields:["*"]}),
	dojo.connect(districtsLayer,"onLoad",function(){debug("** Inside onload districtsLayer ** Graphics:"+districtsLayer.graphics.length)}),
	dojo.connect(districtsLayer,"onUpdateStart",function(){debug("** Inside onUpdateStart districtsLayer ** Graphics:"+districtsLayer.graphics.length)}),
	dojo.connect(districtsLayer,"onUpdateEnd",function(){debug("** Inside onUpdateEnd districtsLayer ** Graphics:"+districtsLayer.graphics.length),dojo.forEach(districtsLayer.graphics,function(a){var b=a.geometry.getExtent().getCenter(),c=a.attributes.DISTRICT,d={OBJECTID_1:"9"+a.attributes.OBJECTID,DISTRICT:c};districtsLayer.add(new esri.Graphic(b,(new esri.symbol.TextSymbol(c)).setColor(new dojo.Color([230,152,0])).setFont((new esri.symbol.Font("11pt")).setWeight(esri.symbol.Font.WEIGHT_BOLD)),d))})}),
	dojo.connect(districtsLayer,"onUpdate",function(){debug("** Inside onupdate districtsLayer **"+districtsLayer.graphics.length)}),
	map.addLayer(districtsLayer),
	
	// make heatlayer
	heatLayer=new modules.HeatLayer(null,{opacity:.9,dotRadius:80,visible:!0,globalMax:!1}),
	map.addLayer(heatLayer),
	debug("heatmap layer ready!!"),

	//make clusterlayer
	clusterLayer=new modules.ClusterLayer(null,{map:map,visible:!1,intervals:4,pixelsSquare:128,rgb:[26,26,26],textrgb:[255,255,255]});
	var b=new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_NULL,new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_DASH,new dojo.Color([150,150,150]),2)),
	c=new esri.Graphic(null,b,null,null);
	dojo.connect(clusterLayer.graphics,"onMouseOver",function(a){c.geometry=a.graphic.attributes.extent,map.graphics.add(c)}),
	dojo.connect(clusterLayer.graphics,"onMouseOut",function(a){map.graphics.remove(c)}),
	dojo.connect(clusterLayer.graphics,"onClick",function(a){var b=new esri.tasks.Query;
	b.geometry=a.graphic.attributes.extent,
	b.outSpatialReference=map.spatialReference,
	b.returnGeometry=!1,
	b.where=getWhereClause(),b.outFields=["*"];
	var c=crimeFeatureLayer.queryFeatures(b,function(b){var c=dojo.map(b.features,function(a){return a.infoTemplate=popupTemplate,a});map.infoWindow.setFeatures(c),map.infoWindow.show(a.mapPoint)});
	map.infoWindow.setContent('<img class="shadow" src="assets/loading6.gif" style="width:105px;border:none;vertical-align:middle;margin:0 auto;"/>'),map.infoWindow.show(a.mapPoint)}),debug("cluster layer ready!!"),setTimeout(showBaseMapGallery,500)
}

function initCrimeLayer(){
	debug("### Inside initCrimeLayer ###"),
	crimeFeatureLayer&&map.getLayer(crimeFeatureLayer.id)&&map.removeLayer(crimeFeatureLayer),
	popupTemplate=new esri.dijit.PopupTemplate({
		title:"Crime Info",fieldInfos:[
		{fieldName:"IncidntNum",visible:!0,label:"Incident"},
		{fieldName:"Date",visible:!0,label:"Date",format:{dateFormat:"shortDateShortTime"}},
		{fieldName:"Category",visible:!0,label:"Category"},
		{fieldName:"PdDistrict",visible:!0,label:"PdDistrict"},{fieldName:"Resolution",visible:!0,label:"Resolution"},
		{fieldName:"Location",visible:!0,label:"Location",format:fixEmpty}]
	});
	// var a=crimeLayers[filterOptions.year];
	var a = featureLayerLink;
	crimeFeatureLayer=new esri.layers.FeatureLayer(a,{id:"CrimeFeatureLayer",infoTemplate:popupTemplate,visible:!1,displayOnPan:!0,tileWidth:512,tileHeight:512,outFields:["*"]});
	var b=(new esri.symbol.SimpleMarkerSymbol).setColor(new dojo.Color([0,153,193, 0.5])).setSize(9).setOutline(null),
		c=new esri.renderer.SimpleRenderer(b);
	crimeFeatureLayer.setRenderer(c),
	dojo.connect(crimeFeatureLayer,"onLoad",function(){debug("Inside onload crimefeaturelayer"),filterAndReload()}),
	dojo.connect(crimeFeatureLayer,"onVisibilityChange",function(){debug("Inside onVisibilityChange crimefeaturelayer")}),
	dojo.connect(crimeFeatureLayer,"onUpdateStart",function(){debug("Inside onupdate_start crimefeaturelayer")}),
	dojo.connect(crimeFeatureLayer,"onUpdate",function(){debug("Inside onupdate crimefeaturelayer : "+crimeFeatureLayer.graphics.length)}),
	dojo.connect(crimeFeatureLayer,"onEditsComplete ",function(){debug("Inside onEditsComplete  crimefeaturelayer : "+crimeFeatureLayer.graphics.length)}),
	map.addLayer(crimeFeatureLayer)
}

//function showhideDistricts(){districtsLayer&&(districtsLayer.visible?districtsLayer.hide():districtsLayer.show())}
//function changeDays(a){debug("got day: "+a);var b=[];a=="workweek"?b=["Monday","Tuesday","Wednesday","Thursday","Friday"]:a=="weekends"?b=["Saturday","Sunday"]:b=["ALL"],filterOptions.days=b,filterAndReload()}	
//function changeYear(a){console.log("Inside changeyear, got : "+a),filterOptions.year=a,initCrimeLayer()}
//function changeTime(a){debug("got time: "+a);var b=[];a=="day"?b=["06:01","20:00"]:a=="night"?b=["20:01","23:59","00:00","06:00"]:a=="commute"?b=["07:00","09:00","17:00","19:00"]:a=="nightlife"?b=["21:00","23:59","00:00","02:00"]:b=["ALL"],filterOptions.time=b,filterAndReload()}
//function changeDistrict(a){debug("got district: "+a),filterOptions.district=a,filterAndReload();if(a=="ALL")districtsLayer.hide(),map.setExtent(initialExtent);else{districtsLayer.show(),debug("Zooming into the district - ",districtsLayer.graphics.length);var b="DISTRICT = '"+a+"'";dojo.forEach(districtsLayer.graphics,function(b){var c=b.attributes;c.DISTRICT&&c.DISTRICT==a?(b.show(),b.geometry.getExtent()&&map.setExtent(b.geometry.getExtent(),!0)):b.hide()})}}
//function setCategory(a){a&&debug("Got category: "+a),filterOptions.category=a,filterAndReload()}

function getWhereClause(){
	// function c(){
	// 	return a.length>1?" AND ":""
	// }
	// var a="", b=filterOptions;
	// b.district&&b.district!="ALL"&&(a+=c()+"PdDistrict='"+b.district+"'"),b.category&&b.category!="ALL"&&(a+=c()+"Category='"+b.category+"'");
	// if(b.days&&b.days.length>0&&b.days[0]!="ALL"){
	// 	var d="";
	// 	for(var e=0;e<b.days.length;e++)
	// 		d+="'"+b.days[e]+"'", e<b.days.length-1&&(d+=",");
	// 	a+=c()+"DayOfWeek IN ("+d+")"
	// }
	// if(b.time&&b.time.length>0&&b.time[0]!="ALL"){
	// 	var f="";
	// 	b.time.length==1?a+=c()+"Time = '"+b.time[0]+"'":b.time.length==2?a+=c()+"Time BETWEEN '"+b.time[0]+"' AND '"+b.time[1]+"'":b.time.length==4&&(a+=c()+"(Time BETWEEN '"+b.time[0]+"' AND '"+b.time[1]+"' OR Time BETWEEN '"+b.time[2]+"' AND '"+b.time[3]+"')")
	// }
	// return a.length==0&&(a="1=1"),
	// debug("Where: "+a), a
	return "OBJECTID > 0";
}
function filterAndReload(){
	showLoadingImage(),dojo.byId("cmap_info").innerHTML="Getting data ...";
	var a=new Date;
	debug("Inside filterAndReload");
	var b=getWhereClause(), c=new esri.tasks.Query;
	c.outSpatialReference=map.spatialReference,
	crimeFeatureLayer.setDefinitionExpression(b),
	crimeFeatureLayer.queryFeatures(
		c,
		function(b){
			if(!b||!b.features)throw Error("QueryFeatures : Features not avaiable");
			debug("QueryFeatures got ",b.features.length," features back"),
			hideLoadingimage(); 
			var c=new Date; 
			debug("Data load time = "+(c-a)+" millis"),stats.loadtime=c-a,addFeatures(b.features)
		},
		function(b){ 
			alert(b),
			hideLoadingimage();
			var c=new Date;
			debug("Data error time = "+(c-a)+" millis")
		}
	)
}

function showLoadingImage(){dojo.byId("loadingImage").style.display=""}
function hideLoadingimage(){dojo.byId("loadingImage").style.display="none"}
//function showFeed(a){return;var b}
function addFeatures(a){stats.total=a.length,showLoadingImage();var b=[],c=[];dojo.forEach(a,function(a){var c=a.geometry;b.push({x:c.x,y:c.y})}),heatLayer.setData(b),clusterLayer.setData(b);var d="No collection sites were found";b.length>0&&(d=dojo.number.format(b.length,{pattern:"###,###,###"})+" Collection sites"),dojo.byId("cmap_info").innerHTML=d,hideLoadingimage(),delete b,delete c,updateLayersVisibility()}

function showhidePoints(){
	debug("Inside showhide points"),
	crimeFeatureLayer&&crimeFeatureLayer.graphics&&(
		showState.heatmap=!1,
		showState.clusters=!1,
		stats.total<7001?showState.points=!0:(
			showState.points=!1,
			alert("Too many points, try filtering down by crime categories")
		),
		updateLayersVisibility()
	)
}

function showhideCluster(){debug("Inside showhide cluster"),clusterLayer&&clusterLayer.data&&(showState.clusters=!showState.clusters,showState.heatmap=!1,showState.points=!1,updateLayersVisibility())}
function updateLayersVisibility(){map.infoWindow.hide(),stats.total<7001?dijit.byId("rb1").setDisabled(!1):(crimeFeatureLayer.visible?alert("check this"):"",dijit.byId("rb1").setDisabled(!0)),showState.clusters?clusterLayer.setVisibility(!0):clusterLayer.setVisibility(!1),showState.heatmap?heatLayer.show():heatLayer.hide(),showState.points?crimeFeatureLayer.show():crimeFeatureLayer.hide(),debug(dojo.toJson(showState)),dojo.byId("loadtime_info").innerHTML=stats.loadtime/1e3%60+" secs"}
function showhideHeatMap(){debug("Inside showhide heatmap"),heatLayer&&heatLayer.data&&(showState.heatmap=!showState.heatmap,showState.clusters=!1,showState.points=!1,updateLayersVisibility())}
function resetUI(){debug("Resetting UI"),dojo.byId("cmap_info").innerHTML=""}
function showCoords(a){var b=dojo.byId("coordsinfo");if(b===null||b===undefined){console.error("coords div not defined");return}var c=esri.geometry.webMercatorToGeographic(a.mapPoint||a);if(c===null||c===undefined)return;b.innerHTML="Lat: "+c.y.toFixed(2)+"&nbsp;&nbsp;Lon: "+c.x.toFixed(2)}
function onMapExtentChange(){var a=Math.round(esri.geometry.getScale(map));a>999&&a<=999999?a=Math.round(a/1e3)+" K":a>999999?a=Math.round(a/1e6)+" M":a>0&&a<=999&&(a=Math.round(a)+" Ft"),dojo.byId("scaleinfo").innerHTML="Scale: 1 <b>:</b> "+a,map.graphics.clear()}
function showBaseMapGallery(){var a=new esri.dijit.BasemapGallery({showArcGISBasemaps:!0,map:map},"basemapGallery");a.startup()}
//function showAdvancedSearch(){var a=null;dijit.byId("advancedDialog")?a=dijit.byId("advancedDialog"):a=new dijit.Dialog({id:"advancedDialog",title:"Advanced Filter Tool",style:"width: 600px; height:400px; max-height:50%; overflow:auto;",content:""}),a.show()}
function fixURL(a){var b=/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/i;return a(b,"<br/><a href='$1' target='_blank'>$1</a><br/>")}
function fixEmpty(a){return a&&a!==undefined&&a.length>0?a.trim():"None"}
function debug(a){isDebug&&console.log(a)}
//variables
var map,basemapLayer,crimeFeatureLayer,districtsLayer,clusterLayer,heatLayer,popupTemplate,stat,initialExtent,isDebug=0,filterOptions={year:"2012",days:["ALL"],time:["ALL"],district:"ALL",category:"ARSON"},showState={points:!1,heatmap:!1,clusters:!0},stats={total:0,loadtime:0},crimeCategories={violent:["Murder","Robbery","Assault"],nuisiance:["Narcotics","Alchohol","Prostitution","Peace"],theft:["Theft"]},crimeLayers={2012:"http://services.arcgis.com/6DIQcwlPy8knb6sg/arcgis/rest/services/SFPD_Incidents_2012/FeatureServer/0",2011:"http://services.arcgis.com/6DIQcwlPy8knb6sg/arcgis/rest/services/SFPD_Incidents_2011/FeatureServer/0",2010:"http://services.arcgis.com/6DIQcwlPy8knb6sg/arcgis/rest/services/SFPD_Incidents_2010/FeatureServer/0",2009:"http://services.arcgis.com/6DIQcwlPy8knb6sg/arcgis/rest/services/SFPD_Incidents_2009/FeatureServer/0",2008:"http://services.arcgis.com/6DIQcwlPy8knb6sg/arcgis/rest/services/SFPD_Incidents_2008/FeatureServer/0",2007:"http://services.arcgis.com/6DIQcwlPy8knb6sg/arcgis/rest/services/SFPD_Incidents_2007/FeatureServer/0",2006:"http://services.arcgis.com/6DIQcwlPy8knb6sg/arcgis/rest/services/SFPD_Incidents_2006/FeatureServer/0",2005:"http://services.arcgis.com/6DIQcwlPy8knb6sg/arcgis/rest/services/SFPD_Incidents_2005/FeatureServer/0",2004:"http://services.arcgis.com/6DIQcwlPy8knb6sg/arcgis/rest/services/SFPD_Incidents_2004/FeatureServer/0",2003:"http://services.arcgis.com/6DIQcwlPy8knb6sg/arcgis/rest/services/SFPD_Incidents_2003/FeatureServer/0"};