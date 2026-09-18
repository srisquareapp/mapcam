import React, { useEffect, useRef, useState } from "react";
import {
  Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Switch,
  Text, TextInput, View, Dimensions
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import * as Location from "expo-location";
import * as MediaLibrary from "expo-media-library";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MapView, { Marker, Polyline } from "react-native-maps";

const BEIGE = "#F3E7D2";
const CREAM = "#FFF9EF";
const BROWN = "#5A3518";
const GOLD = "#B7832F";
const DARK = "#23170D";
const MUTED = "#8B725A";

type Screen = "home" | "camera" | "settings" | "site" | "gallery" | "locations";
type Mode = "photo" | "video";

type GPS = {
  latitude: number;
  longitude: number;
  address: string;
  altitude?: number | null;
  heading?: number | null;
};

type Settings = {
  locationLock: boolean;
  lockedLocation?: GPS | null;
  lockRadius: number;
  audio: boolean;
  showMap: boolean;
  showAddress: boolean;
  showCoordinates: boolean;
  showDate: boolean;
  showCompass: boolean;
  showAltitude: boolean;
  watermark: string;
  siteName: string;
};

const DEFAULTS: Settings = {
  locationLock: false,
  lockedLocation: null,
  lockRadius: 200,
  audio: true,
  showMap: true,
  showAddress: true,
  showCoordinates: true,
  showDate: true,
  showCompass: true,
  showAltitude: true,
  watermark: "Map Cam",
  siteName: ""
};

const STORAGE = "MAP_CAM_SETTINGS_V1";

function Card({ children, onPress, style }: any) {
  return <Pressable onPress={onPress} style={[styles.card, style]}>{children}</Pressable>;
}

function IconButton({ label, onPress }: {label:string; onPress:()=>void}) {
  return <Pressable onPress={onPress} style={styles.iconButton}><Text style={styles.iconText}>{label}</Text></Pressable>;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [mode, setMode] = useState<Mode>("photo");
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [gps, setGps] = useState<GPS | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMic] = useMicrophonePermissions();

  useEffect(() => {
    AsyncStorage.getItem(STORAGE).then(v => {
      if (v) setSettings({...DEFAULTS, ...JSON.parse(v)});
    });
    refreshGPS();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE, JSON.stringify(settings));
  }, [settings]);

  async function refreshGPS() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const coords = p.coords;
    let address = `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
    try {
      const places = await Location.reverseGeocodeAsync(coords);
      if (places[0]) {
        const x = places[0];
        address = [x.name, x.street, x.city, x.region, x.country].filter(Boolean).join(", ");
      }
    } catch {}
    setGps({
      latitude: coords.latitude,
      longitude: coords.longitude,
      address,
      altitude: coords.altitude,
      heading: coords.heading
    });
  }

  function openCamera(nextMode: Mode) {
    setMode(nextMode);
    setScreen("camera");
  }

  function lockCurrentLocation() {
    if (!gps) return Alert.alert("GPS unavailable", "Wait for a GPS fix and try again.");
    setSettings(s => ({...s, locationLock: true, lockedLocation: gps}));
    Alert.alert("Location locked", gps.address);
  }

  const effectiveGPS = settings.locationLock && settings.lockedLocation ? settings.lockedLocation : gps;

  if (screen === "camera") {
    return <CameraScreen mode={mode} setMode={setMode} gps={effectiveGPS} settings={settings}
      setSettings={setSettings} onClose={()=>setScreen("home")} requestPermission={requestPermission}
      permission={permission} micPermission={micPermission} requestMic={requestMic}/>;
  }

  if (screen === "settings") {
    return <SettingsScreen settings={settings} setSettings={setSettings} gps={gps}
      onClose={()=>setScreen("home")} onLock={lockCurrentLocation}/>;
  }

  if (screen === "site") {
    return <SiteScreen gps={effectiveGPS} onClose={()=>setScreen("home")}/>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark"/>
      <ScrollView contentContainerStyle={styles.home}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Map Cam</Text>
            <Text style={styles.tag}>CAPTURE • MEASURE • MARK • SHARE</Text>
          </View>
          <Pressable onPress={()=>setScreen("settings")}><Text style={styles.gear}>⚙</Text></Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.pin}>📍</Text>
          <Text style={styles.heroTitle}>Capture with Location</Text>
          <Text style={styles.heroSub}>{effectiveGPS ? effectiveGPS.address : "Getting GPS location…"}</Text>
          <View style={styles.gpsPill}><Text style={styles.gpsPillText}>{effectiveGPS ? "● GPS READY" : "● GETTING GPS"}</Text></View>
        </View>

        <View style={styles.grid}>
          <Card onPress={()=>openCamera("photo")}><Text style={styles.bigIcon}>📸</Text><Text style={styles.cardTitle}>Photo</Text><Text style={styles.cardSub}>GPS Stamp</Text></Card>
          <Card onPress={()=>openCamera("video")}><Text style={styles.bigIcon}>🎥</Text><Text style={styles.cardTitle}>Video</Text><Text style={styles.cardSub}>GPS + Audio</Text></Card>
          <Card onPress={()=>setScreen("gallery")}><Text style={styles.bigIcon}>🖼️</Text><Text style={styles.cardTitle}>Gallery</Text><Text style={styles.cardSub}>View & Share</Text></Card>
          <Card onPress={()=>setScreen("locations")}><Text style={styles.bigIcon}>📍</Text><Text style={styles.cardTitle}>Locations</Text><Text style={styles.cardSub}>Saved Places</Text></Card>
          <Card onPress={()=>setScreen("site")}><Text style={styles.bigIcon}>📐</Text><Text style={styles.cardTitle}>Site Scaling</Text><Text style={styles.cardSub}>Measure Area</Text></Card>
          <Card onPress={()=>setScreen("settings")}><Text style={styles.bigIcon}>⚙️</Text><Text style={styles.cardTitle}>Settings</Text><Text style={styles.cardSub}>Camera & GPS</Text></Card>
        </View>

        <Card style={styles.siteCard} onPress={()=>setScreen("site")}>
          <Text style={styles.siteTitle}>🏗️ Site Mode</Text>
          <Text style={styles.siteText}>{settings.siteName || "Create a property / project site"}</Text>
          <Text style={styles.link}>Open Site Tools →</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function CameraScreen({mode,setMode,gps,settings,setSettings,onClose,requestPermission,permission,micPermission,requestMic}: any) {
  const camera = useRef<CameraView>(null);
  const [recording, setRecording] = useState(false);
  const [zoom, setZoom] = useState(0);

  async function ensure() {
    if (!permission?.granted) await requestPermission();
    if (mode === "video" && settings.audio && !micPermission?.granted) await requestMic();
  }

  async function takePhoto() {
    await ensure();
    if (!camera.current) return;
    const photo = await camera.current.takePictureAsync({ quality: 1 });
    if (photo?.uri) {
      await MediaLibrary.requestPermissionsAsync();
      await MediaLibrary.saveToLibraryAsync(photo.uri);
      Alert.alert("Photo saved", "Original photo saved. GPS stamp details are shown on the camera preview and can be used by the stamp/export layer.");
    }
  }

  async function toggleVideo() {
    await ensure();
    if (!camera.current) return;
    if (recording) {
      camera.current.stopRecording();
      setRecording(false);
      return;
    }
    setRecording(true);
    try {
      const video = await camera.current.recordAsync({ maxDuration: 600 });
      if (video?.uri) {
        await MediaLibrary.requestPermissionsAsync();
        await MediaLibrary.saveToLibraryAsync(video.uri);
        Alert.alert("Video saved", "Video saved to your gallery.");
      }
    } catch (e) {
      Alert.alert("Video error", "Recording could not be completed.");
    } finally {
      setRecording(false);
    }
  }

  if (!permission?.granted) {
    return <SafeAreaView style={styles.safe}><View style={styles.permission}><Text style={styles.title}>Camera permission</Text><Text style={styles.cardSub}>Map Cam needs camera access to capture photos and videos.</Text><Pressable style={styles.primary} onPress={requestPermission}><Text style={styles.primaryText}>Allow Camera</Text></Pressable><Pressable onPress={onClose}><Text style={styles.link}>Back</Text></Pressable></View></SafeAreaView>;
  }

  return (
    <View style={styles.cameraRoot}>
      <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" zoom={zoom} mode={mode}>
        <View style={styles.cameraTop}>
          <IconButton label="×" onPress={onClose}/>
          <View style={styles.modeSwitch}>
            <Pressable onPress={()=>{setMode("photo");setRecording(false)}} style={[styles.modeBtn, mode==="photo"&&styles.modeActive]}><Text>Photo</Text></Pressable>
            <Pressable onPress={()=>{setMode("video");setRecording(false)}} style={[styles.modeBtn, mode==="video"&&styles.modeActive]}><Text>Video</Text></Pressable>
          </View>
          <IconButton label="⚙" onPress={()=>Alert.alert("Camera Settings","Use Settings from the home screen to configure Map Cam.")}/>
        </View>

        <View style={styles.cameraTools}>
          <IconButton label="⚡" onPress={()=>{}}/>
          <IconButton label="GPS" onPress={()=>Alert.alert("GPS",gps ? gps.address : "GPS unavailable")}/>
          <IconButton label="▦" onPress={()=>{}}/>
        </View>

        <View style={styles.stamp}>
          <View style={{flex:1}}>
            {settings.siteName ? <Text style={styles.stampSite}>{settings.siteName}</Text> : null}
            {settings.showAddress && gps ? <Text style={styles.stampText}>📍 {gps.address}</Text> : null}
            {settings.showCoordinates && gps ? <Text style={styles.stampText}>Lat {gps.latitude.toFixed(6)}  •  Long {gps.longitude.toFixed(6)}</Text> : null}
            {settings.showDate ? <Text style={styles.stampText}>🗓 {new Date().toLocaleString()}</Text> : null}
            {settings.showCompass ? <Text style={styles.stampText}>🧭 {gps?.heading != null ? `${Math.round(gps.heading)}°` : "—"}</Text> : null}
            {settings.showAltitude ? <Text style={styles.stampText}>⛰ Alt {gps?.altitude != null ? `${Math.round(gps.altitude)} m` : "—"}</Text> : null}
            {settings.watermark ? <Text style={styles.watermark}>{settings.watermark}</Text> : null}
          </View>
          {settings.showMap && gps ? <MapView style={styles.miniMap} initialRegion={{latitude:gps.latitude,longitude:gps.longitude,latitudeDelta:.004,longitudeDelta:.004}} scrollEnabled={false} zoomEnabled={false}><Marker coordinate={gps}/></MapView> : null}
        </View>

        <View style={styles.cameraBottom}>
          {mode==="video" && <Pressable onPress={()=>setSettings((s:any)=>({...s,audio:!s.audio}))} style={styles.audio}><Text style={styles.audioText}>{settings.audio ? "🎙 ON" : "🔇 OFF"}</Text><Text style={styles.audioSmall}>Audio</Text></Pressable>}
          {mode==="photo" ? <Pressable onPress={takePhoto} style={styles.shutter}><View style={styles.shutterInner}/></Pressable> :
            <Pressable onPress={toggleVideo} style={[styles.record,{backgroundColor:recording?"#B3261E":"#fff"}]}><View style={styles.recordInner}/></Pressable>}
          <Pressable onPress={()=>setZoom(zoom >= .5 ? 0 : zoom + .5)} style={styles.zoom}><Text style={styles.zoomText}>{zoom === 0 ? "1×" : `${(1+zoom).toFixed(1)}×`}</Text></Pressable>
        </View>
      </CameraView>
    </View>
  );
}

function SettingsScreen({settings,setSettings,gps,onClose,onLock}: any) {
  const set = (key: keyof Settings, value:any) => setSettings((s:any)=>({...s,[key]:value}));
  return <SafeAreaView style={styles.safe}>
    <ScrollView contentContainerStyle={styles.settings}>
      <View style={styles.pageHeader}><Pressable onPress={onClose}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.pageTitle}>Settings</Text></View>

      <Text style={styles.section}>LOCATION</Text>
      <View style={styles.settingCard}>
        <Row label="Location Lock" value={settings.locationLock} onValueChange={(v:any)=>set("locationLock",v)}/>
        <Row label="Show location on stamp" value={settings.showAddress} onValueChange={(v:any)=>set("showAddress",v)}/>
        <Row label="Show map on stamp" value={settings.showMap} onValueChange={(v:any)=>set("showMap",v)}/>
        <Pressable style={styles.settingRow} onPress={onLock}><Text style={styles.rowLabel}>Lock Current Location</Text><Text style={styles.chevron}>›</Text></Pressable>
        <Pressable style={styles.settingRow} onPress={()=>Alert.alert("Radius","Set radius: 50m, 100m, 200m or 500m in the next version.")}><Text style={styles.rowLabel}>Allowed Radius</Text><Text style={styles.value}>{settings.lockRadius} m ›</Text></Pressable>
      </View>

      <Text style={styles.section}>CAMERA CONFIGURATION</Text>
      <View style={styles.settingCard}>
        <Pressable style={styles.settingRow} onPress={()=>Alert.alert("Default Mode","Choose Photo or Video in the next version.")}><Text style={styles.rowLabel}>Default Mode</Text><Text style={styles.value}>Photo ›</Text></Pressable>
        <Pressable style={styles.settingRow} onPress={()=>Alert.alert("Photo","Camera resolution follows the device camera.")}><Text style={styles.rowLabel}>Photo Resolution</Text><Text style={styles.value}>Device ›</Text></Pressable>
        <Pressable style={styles.settingRow} onPress={()=>Alert.alert("Video","Select 4K / 1080p / 720p where supported.")}><Text style={styles.rowLabel}>Video Resolution</Text><Text style={styles.value}>1080p ›</Text></Pressable>
        <Row label="Audio in Video" value={settings.audio} onValueChange={(v:any)=>set("audio",v)}/>
        <Row label="Save Original" value={true} onValueChange={()=>{}}/>
      </View>

      <Text style={styles.section}>GPS STAMP</Text>
      <View style={styles.settingCard}>
        <Row label="Date & Time" value={settings.showDate} onValueChange={(v:any)=>set("showDate",v)}/>
        <Row label="Latitude & Longitude" value={settings.showCoordinates} onValueChange={(v:any)=>set("showCoordinates",v)}/>
        <Row label="Compass Direction" value={settings.showCompass} onValueChange={(v:any)=>set("showCompass",v)}/>
        <Row label="Altitude" value={settings.showAltitude} onValueChange={(v:any)=>set("showAltitude",v)}/>
        <Pressable style={styles.settingRow} onPress={()=>Alert.prompt("Watermark","Enter watermark",v=>set("watermark",v), "plain-text", settings.watermark)}><Text style={styles.rowLabel}>Custom Watermark</Text><Text style={styles.value}>{settings.watermark} ›</Text></Pressable>
      </View>

      <Text style={styles.section}>SITE MODE</Text>
      <View style={styles.settingCard}>
        <Pressable style={styles.settingRow} onPress={()=>Alert.prompt("Site Name","Enter project / property name",v=>set("siteName",v || ""), "plain-text", settings.siteName)}><Text style={styles.rowLabel}>Site / Project Name</Text><Text style={styles.value}>{settings.siteName || "Not set"} ›</Text></Pressable>
      </View>
    </ScrollView>
  </SafeAreaView>;
}

function Row({label,value,onValueChange}:any) {
  return <View style={styles.settingRow}><Text style={styles.rowLabel}>{label}</Text><Switch value={value} onValueChange={onValueChange} trackColor={{false:"#D8CBB8",true:GOLD}} thumbColor="#fff"/></View>;
}

function SiteScreen({gps,onClose}: {gps:GPS|null; onClose:()=>void}) {
  const [length,setLength]=useState("");
  const [width,setWidth]=useState("");
  const [unit,setUnit]=useState<"ft"|"m">("ft");
  const [points,setPoints]=useState<{latitude:number;longitude:number}[]>([]);
  const [mapRegion,setMapRegion]=useState<any>(gps ? {latitude:gps.latitude,longitude:gps.longitude,latitudeDelta:.01,longitudeDelta:.01} : {latitude:16.5,longitude:80.6,latitudeDelta:.1,longitudeDelta:.1});

  const L=Number(length)||0, W=Number(width)||0;
  const area=L*W;
  const sqYd=unit==="ft" ? area/9 : area*1.19599;
  const cents=unit==="ft" ? area/435.6 : area*10.7639/435.6;

  function addPoint(e:any) {
    setPoints(p=>[...p,e.nativeEvent.coordinate]);
  }
  function distance(a:any,b:any) {
    const R=6371000, toRad=(x:number)=>x*Math.PI/180;
    const dLat=toRad(b.latitude-a.latitude), dLon=toRad(b.longitude-a.longitude);
    const x=Math.sin(dLat/2)**2+Math.cos(toRad(a.latitude))*Math.cos(toRad(b.latitude))*Math.sin(dLon/2)**2;
    return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
  }
  const perimeter=points.length>1 ? points.reduce((sum,p,i)=>i?sum+distance(points[i-1],p):0,0) + (points.length>2?distance(points[points.length-1],points[0]):0) : 0;

  return <SafeAreaView style={styles.safe}>
    <ScrollView contentContainerStyle={styles.settings}>
      <View style={styles.pageHeader}><Pressable onPress={onClose}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.pageTitle}>Site Scaling</Text></View>
      <Text style={styles.section}>SITE DIMENSIONS</Text>
      <View style={styles.settingCard}>
        <View style={styles.inputs}><TextInput keyboardType="decimal-pad" placeholder="Length" value={length} onChangeText={setLength} style={styles.input}/><TextInput keyboardType="decimal-pad" placeholder="Width" value={width} onChangeText={setWidth} style={styles.input}/></View>
        <View style={styles.units}><Pressable onPress={()=>setUnit("ft")} style={[styles.unit,unit==="ft"&&styles.unitActive]}><Text>Feet</Text></Pressable><Pressable onPress={()=>setUnit("m")} style={[styles.unit,unit==="m"&&styles.unitActive]}><Text>Metres</Text></Pressable></View>
        <Text style={styles.area}>Area: <Text style={{fontWeight:"800"}}>{area ? area.toFixed(2) : "—"} {unit}²</Text></Text>
        <Text style={styles.conversions}>{area ? `${sqYd.toFixed(2)} sq.yd  •  ${cents.toFixed(2)} cents` : "Enter dimensions to calculate"}</Text>
      </View>

      <Text style={styles.section}>MAP MEASURE</Text>
      <View style={styles.mapCard}>
        <MapView style={styles.bigMap} initialRegion={mapRegion} onPress={addPoint} showsUserLocation={!!gps}>
          {gps && <Marker coordinate={gps}/>}
          {points.map((p,i)=><Marker key={i} coordinate={p} title={`Point ${i+1}`}/>)}
          {points.length>1 && <Polyline coordinates={points} strokeWidth={3}/>}
          {points.length>2 && <Polyline coordinates={[points[points.length-1],points[0]]} strokeWidth={3}/>}
        </MapView>
        <Text style={styles.measureText}>Tap points on the map to measure a boundary.</Text>
        <View style={styles.measureStats}>
          <Text>Points: {points.length}</Text>
          <Text>Perimeter: {perimeter ? `${perimeter.toFixed(1)} m` : "—"}</Text>
        </View>
        <Pressable style={styles.secondary} onPress={()=>setPoints([])}><Text style={styles.secondaryText}>Clear Measurements</Text></Pressable>
      </View>
      <Text style={styles.note}>Map-based measurement is an estimate. For legal land survey work, use a licensed surveyor and survey-grade equipment.</Text>
    </ScrollView>
  </SafeAreaView>;
}

const Placeholder = ({title,onClose}:any)=><SafeAreaView style={styles.safe}><View style={styles.permission}><Text style={styles.title}>{title}</Text><Text style={styles.cardSub}>This section is reserved for the next Map Cam build.</Text><Pressable style={styles.primary} onPress={onClose}><Text style={styles.primaryText}>Back Home</Text></Pressable></View></SafeAreaView>;

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:BEIGE},
  home:{padding:18,paddingBottom:40},
  header:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:18},
  brand:{fontSize:38,fontWeight:"900",color:BROWN,letterSpacing:-1},
  tag:{fontSize:10,fontWeight:"800",letterSpacing:1.5,color:GOLD,marginTop:2},
  gear:{fontSize:28,color:BROWN},
  hero:{backgroundColor:CREAM,borderRadius:24,padding:18,marginBottom:16,borderWidth:1,borderColor:"#E3D2B7"},
  pin:{fontSize:30},
  heroTitle:{fontSize:20,fontWeight:"800",color:DARK,marginTop:4},
  heroSub:{fontSize:13,color:MUTED,marginTop:5},
  gpsPill:{alignSelf:"flex-start",backgroundColor:"#E9D7B8",paddingHorizontal:10,paddingVertical:5,borderRadius:20,marginTop:10},
  gpsPillText:{fontSize:10,fontWeight:"800",color:BROWN},
  grid:{flexDirection:"row",flexWrap:"wrap",justifyContent:"space-between"},
  card:{width:"48%",backgroundColor:CREAM,borderRadius:20,padding:17,marginBottom:12,borderWidth:1,borderColor:"#E5D5BD",minHeight:120},
  bigIcon:{fontSize:32,marginBottom:8},
  cardTitle:{fontSize:17,fontWeight:"800",color:DARK},
  cardSub:{fontSize:12,color:MUTED,marginTop:3},
  siteCard:{width:"100%",minHeight:0},
  siteTitle:{fontSize:18,fontWeight:"900",color:BROWN},
  siteText:{fontSize:13,color:MUTED,marginTop:5},
  link:{color:GOLD,fontWeight:"800",marginTop:12},
  cameraRoot:{flex:1,backgroundColor:"#000"},
  cameraTop:{paddingTop:50,paddingHorizontal:14,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
  iconButton:{width:48,height:48,borderRadius:24,backgroundColor:"rgba(30,20,10,.72)",alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:"rgba(255,255,255,.4)"},
  iconText:{fontSize:20,color:"#fff",fontWeight:"800"},
  modeSwitch:{flexDirection:"row",backgroundColor:"rgba(255,249,239,.9)",borderRadius:24,padding:3},
  modeBtn:{paddingHorizontal:20,paddingVertical:9,borderRadius:20},
  modeActive:{backgroundColor:GOLD},
  cameraTools:{position:"absolute",top:125,left:14,gap:10},
  stamp:{position:"absolute",left:14,right:14,bottom:150,backgroundColor:"rgba(35,23,13,.84)",borderRadius:16,padding:12,flexDirection:"row"},
  stampText:{color:"#fff",fontSize:11,marginBottom:4},
  stampSite:{color:"#F3D08A",fontWeight:"900",fontSize:13,marginBottom:5},
  watermark:{color:"#E5C07B",fontWeight:"900",fontSize:10,marginTop:3},
  miniMap:{width:90,height:90,borderRadius:10},
  cameraBottom:{position:"absolute",left:0,right:0,bottom:40,alignItems:"center",justifyContent:"center",flexDirection:"row"},
  shutter:{width:78,height:78,borderRadius:39,backgroundColor:"#fff",alignItems:"center",justifyContent:"center",borderWidth:4,borderColor:"rgba(0,0,0,.25)"},
  shutterInner:{width:64,height:64,borderRadius:32,borderWidth:2,borderColor:BROWN},
  record:{width:76,height:76,borderRadius:38,alignItems:"center",justifyContent:"center",borderWidth:4,borderColor:"#fff"},
  recordInner:{width:28,height:28,borderRadius:6,backgroundColor:"#B3261E"},
  audio:{position:"absolute",left:20,alignItems:"center"},
  audioText:{fontWeight:"900",color:"#fff",fontSize:14},
  audioSmall:{color:"#fff",fontSize:10},
  zoom:{position:"absolute",right:20,width:54,height:54,borderRadius:27,backgroundColor:"rgba(35,23,13,.72)",alignItems:"center",justifyContent:"center"},
  zoomText:{color:"#fff",fontWeight:"800"},
  permission:{flex:1,alignItems:"center",justifyContent:"center",padding:30},
  title:{fontSize:28,fontWeight:"900",color:BROWN,marginBottom:8},
  primary:{backgroundColor:BROWN,borderRadius:14,paddingHorizontal:24,paddingVertical:14,marginTop:20},
  primaryText:{color:"#fff",fontWeight:"900"},
  settings:{padding:18,paddingBottom:50},
  pageHeader:{flexDirection:"row",alignItems:"center",marginBottom:20},
  back:{fontSize:40,color:BROWN,lineHeight:40,marginRight:8},
  pageTitle:{fontSize:28,fontWeight:"900",color:DARK},
  section:{fontSize:11,fontWeight:"900",letterSpacing:1.5,color:MUTED,marginTop:12,marginBottom:8},
  settingCard:{backgroundColor:CREAM,borderRadius:18,borderWidth:1,borderColor:"#E4D4BC",overflow:"hidden"},
  settingRow:{minHeight:54,paddingHorizontal:16,flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderBottomWidth:1,borderBottomColor:"#EDE2D3"},
  rowLabel:{fontSize:15,color:DARK,fontWeight:"600"},
  value:{fontSize:13,color:MUTED},
  chevron:{fontSize:24,color:MUTED},
  inputs:{flexDirection:"row",gap:10,padding:14},
  input:{flex:1,backgroundColor:"#F7EEDF",borderRadius:12,padding:12,fontSize:16},
  units:{flexDirection:"row",paddingHorizontal:14,paddingBottom:14,gap:8},
  unit:{paddingVertical:9,paddingHorizontal:18,borderRadius:20,backgroundColor:"#EADCC7"},
  unitActive:{backgroundColor:GOLD},
  area:{fontSize:18,color:BROWN,fontWeight:"700",paddingHorizontal:14},
  conversions:{fontSize:12,color:MUTED,padding:14},
  mapCard:{backgroundColor:CREAM,borderRadius:18,overflow:"hidden",borderWidth:1,borderColor:"#E4D4BC"},
  bigMap:{height:300,width:"100%"},
  measureText:{padding:12,color:MUTED,fontSize:12},
  measureStats:{paddingHorizontal:12,paddingBottom:12,flexDirection:"row",justifyContent:"space-between"},
  secondary:{margin:12,marginTop:0,borderRadius:12,borderWidth:1,borderColor:GOLD,padding:12,alignItems:"center"},
  secondaryText:{color:BROWN,fontWeight:"800"},
  note:{fontSize:11,color:MUTED,lineHeight:16,marginTop:12}
});
