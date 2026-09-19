import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Switch,
  Text, TextInput, View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker, Polyline } from 'react-native-maps';

const C = { bg:'#F3E7D2', card:'#FFF9EF', brown:'#5A3518', gold:'#B7832F',
  dark:'#23170D', muted:'#8B725A', line:'#E4D4BC' };

type Screen='home'|'camera'|'settings'|'site'|'gallery'|'locations';
type Mode='photo'|'video';
type GPS={latitude:number;longitude:number;address:string;altitude?:number|null;heading?:number|null};
type Settings={
  locationLock:boolean; lockedLocation:GPS|null; lockRadius:number; audio:boolean;
  showMap:boolean; showAddress:boolean; showCoordinates:boolean; showDate:boolean;
  showCompass:boolean; showAltitude:boolean; watermark:string; siteName:string;
  siteLength:string; siteWidth:string; siteUnit:'ft'|'m';
};
const D:Settings={
  locationLock:false,lockedLocation:null,lockRadius:200,audio:true,showMap:true,
  showAddress:true,showCoordinates:true,showDate:true,showCompass:true,
  showAltitude:true,watermark:'Map Cam',siteName:'',siteLength:'',siteWidth:'',siteUnit:'ft'
};
const KEY='MAP_CAM_SETTINGS_V3';

function validGPS(v:any):v is GPS {
  return !!v && Number.isFinite(Number(v.latitude)) && Number.isFinite(Number(v.longitude)) &&
    Number(v.latitude)>=-90 && Number(v.latitude)<=90 &&
    Number(v.longitude)>=-180 && Number(v.longitude)<=180;
}

export default function App(){
  const [screen,setScreen]=useState<Screen>('home');
  const [mode,setMode]=useState<Mode>('photo');
  const [s,setS]=useState<Settings>(D);
  const [gps,setGps]=useState<GPS|null>(null);

  useEffect(()=>{
    AsyncStorage.getItem(KEY).then(v=>{
      if(v){try{setS({...D,...JSON.parse(v)})}catch{}}
    }).catch(()=>{});
    getGPS();
  },[]);
  useEffect(()=>{AsyncStorage.setItem(KEY,JSON.stringify(s)).catch(()=>{})},[s]);

  async function getGPS(){
    try{
      const p=await Location.requestForegroundPermissionsAsync();
      if(p.status!=='granted') return;
      const x=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High});
      if(!x?.coords || !Number.isFinite(x.coords.latitude) || !Number.isFinite(x.coords.longitude)) return;
      let address=`${x.coords.latitude.toFixed(6)}, ${x.coords.longitude.toFixed(6)}`;
      try{
        const a=await Location.reverseGeocodeAsync(x.coords);
        if(a?.[0]){
          const z=a[0];
          address=[z.name,z.street,z.city,z.region,z.country].filter(Boolean).join(', ');
        }
      }catch{}
      setGps({latitude:x.coords.latitude,longitude:x.coords.longitude,address,
        altitude:x.coords.altitude,heading:x.coords.heading});
    }catch{}
  }

  const eg=s.locationLock&&validGPS(s.lockedLocation)?s.lockedLocation:(validGPS(gps)?gps:null);
  const lock=()=>{
    if(!validGPS(gps)){Alert.alert('GPS unavailable','Wait for a GPS fix and try again.');return;}
    setS(x=>({...x,locationLock:true,lockedLocation:gps}));
    Alert.alert('Location locked',gps.address);
  };

  if(screen==='camera') return <Camera mode={mode} setMode={setMode} gps={eg} s={s} setS={setS} close={()=>setScreen('home')}/>;
  if(screen==='settings') return <Settings s={s} setS={setS} close={()=>setScreen('home')} lock={lock}/>;
  if(screen==='site') return <Site s={s} setS={setS} gps={eg} close={()=>setScreen('home')}/>;
  if(screen==='gallery') return <Gallery close={()=>setScreen('home')}/>;
  if(screen==='locations') return <Locations gps={validGPS(gps)?gps:null} locked={validGPS(s.lockedLocation)?s.lockedLocation:null} close={()=>setScreen('home')} lock={lock}/>;

  return <SafeAreaView style={st.safe}><StatusBar style="dark"/><ScrollView contentContainerStyle={st.home}>
    <View style={st.header}><View><Text style={st.brand}>Map Cam</Text><Text style={st.tag}>CAPTURE • MEASURE • MARK • SHARE</Text></View>
      <Pressable onPress={()=>setScreen('settings')}><Text style={st.gear}>⚙</Text></Pressable></View>
    <View style={st.hero}><Text style={st.pin}>📍</Text><Text style={st.heroTitle}>Capture with Location</Text>
      <Text style={st.sub}>{eg?eg.address:'Getting GPS location…'}</Text>
      <Text style={st.pill}>{eg?'● GPS READY':'● WAITING FOR GPS'}</Text></View>
    <View style={st.grid}>
      <Tile icon="📸" title="Photo" sub="GPS Stamp" onPress={()=>{setMode('photo');setScreen('camera')}}/>
      <Tile icon="🎥" title="Video" sub={'GPS + Audio '+(s.audio?'ON':'OFF')} onPress={()=>{setMode('video');setScreen('camera')}}/>
      <Tile icon="🖼️" title="Gallery" sub="View & Share" onPress={()=>setScreen('gallery')}/>
      <Tile icon="📍" title="Locations" sub="Saved Places" onPress={()=>setScreen('locations')}/>
      <Tile icon="📐" title="Site Scaling" sub="Size & Area" onPress={()=>setScreen('site')}/>
      <Tile icon="📏" title="Measure" sub="Map Distance" onPress={()=>setScreen('site')}/>
    </View>
    <Pressable style={st.site} onPress={()=>setScreen('site')}>
      <Text style={st.siteTitle}>🏗️ {s.siteName||'Site Mode'}</Text>
      <Text style={st.siteSub}>{s.siteName?'Ready for site photos & measurements':'Create a property / project site'}</Text>
    </Pressable>
  </ScrollView></SafeAreaView>;
}

function Tile({icon,title,sub,onPress}:any){
  return <Pressable onPress={onPress} style={st.tile}><Text style={st.tileIcon}>{icon}</Text>
    <Text style={st.tileTitle}>{title}</Text><Text style={st.tileSub}>{sub}</Text></Pressable>;
}

function Camera({mode,setMode,gps,s,setS,close}:any){
  const ref=useRef<CameraView>(null);
  const [perm,ask]=useCameraPermissions();
  const [mic,askMic]=useMicrophonePermissions();
  const [rec,setRec]=useState(false);
  const [busy,setBusy]=useState(false);

  async function take(){
    if(busy)return;
    if(!perm?.granted){await ask();return;}
    if(!ref.current){Alert.alert('Camera','Camera is still starting. Please wait.');return;}
    setBusy(true);
    try{
      const p=await ref.current.takePictureAsync({quality:1});
      if(p?.uri){
        const mp=await MediaLibrary.requestPermissionsAsync();
        if(!mp.granted){Alert.alert('Photos permission','Allow Photos access to save the picture.');return;}
        await MediaLibrary.saveToLibraryAsync(p.uri);
        Alert.alert('Saved','Original photo saved to your gallery.');
      }
    }catch{Alert.alert('Camera','Photo could not be captured. Please try again.')}
    finally{setBusy(false)}
  }

  async function video(){
    if(!perm?.granted){await ask();return;}
    if(!ref.current){Alert.alert('Camera','Camera is still starting. Please wait.');return;}
    if(rec){try{ref.current.stopRecording()}catch{};return;}
    if(s.audio&&!mic?.granted){
      const mp=await askMic();
      if(!mp?.granted){Alert.alert('Microphone permission','Allow microphone access or turn Audio OFF.');return;}
    }
    setBusy(true);setRec(true);
    try{
      const v=await ref.current.recordAsync({maxDuration:600});
      if(v?.uri){
        const mp=await MediaLibrary.requestPermissionsAsync();
        if(!mp.granted){Alert.alert('Photos permission','Allow Photos access to save the video.');return;}
        await MediaLibrary.saveToLibraryAsync(v.uri);
        Alert.alert('Saved','Video saved to your gallery.');
      }
    }catch{Alert.alert('Video','Recording stopped or failed.')}
    finally{setRec(false);setBusy(false)}
  }

  if(!perm?.granted) return <SafeAreaView style={st.safe}><View style={st.center}>
    <Text style={st.page}>Camera Access</Text><Text style={st.sub}>Allow camera access to use Map Cam.</Text>
    <Pressable style={st.primary} onPress={ask}><Text style={st.primaryText}>Allow Camera</Text></Pressable>
    <Pressable onPress={close}><Text style={st.link}>Back</Text></Pressable>
  </View></SafeAreaView>;

  const g=validGPS(gps)?gps:null;

  return <View style={st.cam}>
    <CameraView ref={ref} style={[StyleSheet.absoluteFill, st.cameraPreview]} facing="back" mode={mode} onCameraReady={()=>{}} />

    {/* Camera controls must be outside CameraView so they render reliably on iOS/Expo Go. */}
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, st.cameraOverlay]}>
      <View style={st.camTop}>
        <Round t="‹" f={close}/>
        <View style={st.mode}>
          <Pressable onPress={()=>setMode('photo')} style={[st.modeBtn,mode==='photo'&&st.active]}><Text>Photo</Text></Pressable>
          <Pressable onPress={()=>setMode('video')} style={[st.modeBtn,mode==='video'&&st.active]}><Text>Video</Text></Pressable>
        </View>
        <Round t="⚙" f={()=>Alert.alert('Camera','Use Settings from Home.')}/>
      </View>

      <View style={st.tools}>
        <Round t="⚡" f={()=>{}}/>
        <Round t={g?'GPS':'GPS…'} f={()=>Alert.alert('GPS',g?g.address:'GPS unavailable')}/>
      </View>

      <View style={st.stamp}>
        <View style={{flex:1}}>
          {s.siteName&&<Text style={st.stampSite}>{s.siteName}</Text>}
          {s.showAddress&&g&&<Text style={st.stampText}>📍 {g.address}</Text>}
          {s.showCoordinates&&g&&<Text style={st.stampText}>Lat {g.latitude.toFixed(6)} • Long {g.longitude.toFixed(6)}</Text>}
          {s.showDate&&<Text style={st.stampText}>🗓 {new Date().toLocaleString()}</Text>}
          {s.showCompass&&<Text style={st.stampText}>🧭 {g?.heading!=null?Math.round(g.heading)+'°':'—'}</Text>}
          {s.showAltitude&&<Text style={st.stampText}>⛰ Alt {g?.altitude!=null?Math.round(g.altitude)+' m':'—'}</Text>}
          <Text style={st.watermark}>{s.watermark}</Text>
        </View>
        {s.showMap&&g&&<MapView style={st.mini} initialRegion={{latitude:g.latitude,longitude:g.longitude,latitudeDelta:.004,longitudeDelta:.004}} scrollEnabled={false} zoomEnabled={false} rotateEnabled={false} pitchEnabled={false}>
          <Marker coordinate={{latitude:g.latitude,longitude:g.longitude}}/>
        </MapView>}
      </View>

      <View style={st.bottom}>
        {mode==='video'&&<Pressable style={st.audio} onPress={()=>setS((x:Settings)=>({...x,audio:!x.audio}))}>
          <Text style={st.audioTxt}>{s.audio?'🎙 ON':'🔇 OFF'}</Text><Text style={st.audioSmall}>Audio</Text>
        </Pressable>}
        {mode==='photo'
          ? <Pressable style={st.shutter} onPress={take} disabled={busy}><View style={st.shutterInner}/></Pressable>
          : <Pressable style={[st.record,rec&&st.recording]} onPress={video} disabled={busy&&!rec}><View style={st.recordInner}/></Pressable>}
      </View>
    </View>
  </View>;
}

function Round({t,f}:any){return <Pressable onPress={f} style={st.round}><Text style={st.roundTxt}>{t}</Text></Pressable>}

function Settings({s,setS,close,lock}:any){
  const set=(k:keyof Settings,v:any)=>setS((x:Settings)=>({...x,[k]:v}));
  return <SafeAreaView style={st.safe}><ScrollView contentContainerStyle={st.settings}><Header title="Settings" close={close}/>
    <Section t="LOCATION"/><Box>
      <Row label="Location Lock" value={s.locationLock} change={(v:boolean)=>set('locationLock',v)}/>
      <Row label="Show address" value={s.showAddress} change={(v:boolean)=>set('showAddress',v)}/>
      <Row label="Show mini map" value={s.showMap} change={(v:boolean)=>set('showMap',v)}/>
      <Pressable style={st.row} onPress={lock}><Text style={st.rowLabel}>Lock Current Location</Text><Text style={st.value}>›</Text></Pressable>
      <Pressable style={st.row} onPress={()=>radius(setS)}><Text style={st.rowLabel}>Lock Radius</Text><Text style={st.value}>{s.lockRadius} m ›</Text></Pressable>
    </Box>
    <Section t="CAMERA CONFIGURATION"/><Box>
      <Row label="Audio in Video" value={s.audio} change={(v:boolean)=>set('audio',v)}/>
      <Row label="Date & Time" value={s.showDate} change={(v:boolean)=>set('showDate',v)}/>
      <Row label="Coordinates" value={s.showCoordinates} change={(v:boolean)=>set('showCoordinates',v)}/>
      <Row label="Compass" value={s.showCompass} change={(v:boolean)=>set('showCompass',v)}/>
      <Row label="Altitude" value={s.showAltitude} change={(v:boolean)=>set('showAltitude',v)}/>
    </Box>
    <Section t="WATERMARK"/><Box><Pressable style={st.row} onPress={()=>Alert.prompt('Watermark','Enter text',v=>set('watermark',v||''),'plain-text',s.watermark)}>
      <Text style={st.rowLabel}>Custom Watermark</Text><Text style={st.value}>{s.watermark} ›</Text></Pressable></Box>
  </ScrollView></SafeAreaView>;
}
function radius(setS:any){Alert.alert('Lock Radius','Choose allowed movement radius.',['50 m','100 m','200 m','500 m'].map(x=>({text:x,onPress:()=>setS((v:Settings)=>({...v,lockRadius:Number(x.split(' ')[0])}))})));}
function Row({label,value,change}:any){return <View style={st.row}><Text style={st.rowLabel}>{label}</Text><Switch value={value} onValueChange={change} trackColor={{false:'#D8CBB8',true:C.gold}}/></View>}
function Box({children}:any){return <View style={st.box}>{children}</View>}
function Section({t}:any){return <Text style={st.section}>{t}</Text>}
function Header({title,close}:any){return <View style={st.head}><Pressable onPress={close}><Text style={st.back}>‹</Text></Pressable><Text style={st.page}>{title}</Text></View>}

function Site({s,setS,gps,close}:any){
  const [pts,setPts]=useState<any[]>([]);
  const L=Number(s.siteLength)||0,W=Number(s.siteWidth)||0,A=L*W;
  const yd=s.siteUnit==='ft'?A/9:A*1.19599;
  const c=s.siteUnit==='ft'?A/435.6:A*10.7639/435.6;
  const g=validGPS(gps)?gps:null;
  const validPts=pts.filter(validGPS);
  const d=(a:any,b:any)=>{
    if(!validGPS(a)||!validGPS(b))return 0;
    const R=6371000,r=Math.PI/180,la=(b.latitude-a.latitude)*r,lo=(b.longitude-a.longitude)*r;
    const q=Math.sin(la/2)**2+Math.cos(a.latitude*r)*Math.cos(b.latitude*r)*Math.sin(lo/2)**2;
    return 2*R*Math.atan2(Math.sqrt(q),Math.sqrt(1-q));
  };
  const per=validPts.length>1?validPts.reduce((n,p,i)=>i?n+d(validPts[i-1],p):0,0)+(validPts.length>2?d(validPts[validPts.length-1],validPts[0]):0):0;
  const initialRegion=g?{latitude:g.latitude,longitude:g.longitude,latitudeDelta:.01,longitudeDelta:.01}:{latitude:16.5,longitude:80.6,latitudeDelta:.1,longitudeDelta:.1};

  return <SafeAreaView style={st.safe}><ScrollView contentContainerStyle={st.settings}><Header title="Site Scaling & Measure" close={close}/>
    <Section t="SITE"/><Box><Pressable style={st.row} onPress={()=>Alert.prompt('Site Name','Project / property name',v=>setS((x:Settings)=>({...x,siteName:v||''})),'plain-text',s.siteName)}>
      <Text style={st.rowLabel}>Site Name</Text><Text style={st.value}>{s.siteName||'Not set'} ›</Text></Pressable>
      <View style={st.inputs}><TextInput placeholder="Length" keyboardType="decimal-pad" value={s.siteLength} onChangeText={v=>setS((x:Settings)=>({...x,siteLength:v}))} style={st.input}/>
        <TextInput placeholder="Width" keyboardType="decimal-pad" value={s.siteWidth} onChangeText={v=>setS((x:Settings)=>({...x,siteWidth:v}))} style={st.input}/></View>
      <View style={st.units}><Pressable onPress={()=>setS((x:Settings)=>({...x,siteUnit:'ft'}))} style={[st.unit,s.siteUnit==='ft'&&st.activeUnit]}><Text>Feet</Text></Pressable>
        <Pressable onPress={()=>setS((x:Settings)=>({...x,siteUnit:'m'}))} style={[st.unit,s.siteUnit==='m'&&st.activeUnit]}><Text>Metres</Text></Pressable></View>
      <Text style={st.area}>Area: {A?A.toFixed(2):'—'} {s.siteUnit}²</Text><Text style={st.muted}>{A?yd.toFixed(2)+' sq.yd • '+c.toFixed(2)+' cents':'Enter dimensions'}</Text>
    </Box>
    <Section t="MAP MEASURE"/><Box><MapView style={st.map} initialRegion={initialRegion} showsUserLocation={!!g}
      onPress={e=>{const p=e?.nativeEvent?.coordinate;if(validGPS(p))setPts(x=>[...x,p])}}>
      {g&&<Marker coordinate={{latitude:g.latitude,longitude:g.longitude}}/>}
      {validPts.map((p,i)=><Marker key={i} coordinate={{latitude:p.latitude,longitude:p.longitude}} title={'Point '+(i+1)}/>)} 
      {validPts.length>1&&<Polyline coordinates={validPts} strokeWidth={3}/>}
      {validPts.length>2&&<Polyline coordinates={[validPts[validPts.length-1],validPts[0]]} strokeWidth={3}/>}
    </MapView>
    <Text style={st.muted}>{g?'Tap map points to measure a boundary.':'GPS unavailable. You can still tap the map to measure points.'}</Text>
    <Text style={st.measure}>Points {validPts.length} • Perimeter {per?per.toFixed(1)+' m':'—'}</Text>
    <Pressable style={st.secondary} onPress={()=>setPts([])}><Text style={st.secondaryText}>Clear Measurements</Text></Pressable></Box>
    <Text style={st.note}>Map measurements are estimates and are not a substitute for a licensed land survey.</Text>
  </ScrollView></SafeAreaView>;
}

function Gallery({close}:any){
  const [a,setA]=useState<any[]>([]);
  useEffect(()=>{MediaLibrary.requestPermissionsAsync().then(async p=>{
    if(p.granted){const r=await MediaLibrary.getAssetsAsync({mediaType:['photo','video'],first:60,sortBy:[MediaLibrary.SortBy.creationTime]});setA(r?.assets||[])}
  }).catch(()=>{})},[]);
  return <SafeAreaView style={st.safe}><View style={st.settings}><Header title="Gallery" close={close}/>
    <Text style={st.muted}>{a.length} recent items</Text><View style={st.gallery}>
      {a.map(x=><View key={x.id} style={st.gitem}><Text style={st.gicon}>{x.mediaType==='video'?'🎥':'📸'}</Text>
        <Text style={st.gtext}>{x?.creationTime?new Date(x.creationTime).toLocaleDateString():'Date unavailable'}</Text></View>)}
    </View></View></SafeAreaView>;
}

function Locations({gps,locked,close,lock}:any){
  return <SafeAreaView style={st.safe}><View style={st.settings}><Header title="Locations" close={close}/><Box>
    <Text style={st.rowLabel}>Current GPS</Text><Text style={st.muted}>{gps?gps.address:'GPS unavailable'}</Text>
    {gps&&<Text style={st.coord}>{gps.latitude.toFixed(6)}, {gps.longitude.toFixed(6)}</Text>}
    <Pressable style={st.primary} onPress={lock}><Text style={st.primaryText}>Lock Current Location</Text></Pressable>
  </Box>{locked&&<Box><Text style={st.rowLabel}>🔒 Locked Location</Text><Text style={st.muted}>{locked.address}</Text>
    <Text style={st.coord}>{locked.latitude.toFixed(6)}, {locked.longitude.toFixed(6)}</Text></Box>}</View></SafeAreaView>;
}

const st=StyleSheet.create({
  safe:{flex:1,backgroundColor:C.bg},home:{padding:18,paddingBottom:40},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:18},
  brand:{fontSize:38,fontWeight:'900',color:C.brown},tag:{fontSize:10,fontWeight:'800',letterSpacing:1.4,color:C.gold},gear:{fontSize:28,color:C.brown},
  hero:{backgroundColor:C.card,borderRadius:24,padding:18,borderWidth:1,borderColor:C.line,marginBottom:16},
  pin:{fontSize:28},heroTitle:{fontSize:20,fontWeight:'900',color:C.dark},sub:{fontSize:13,color:C.muted,marginTop:4},
  pill:{alignSelf:'flex-start',marginTop:10,padding:7,borderRadius:14,backgroundColor:'#E9D7B8',color:C.brown,fontWeight:'900',fontSize:10},
  grid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between'},tile:{width:'48%',backgroundColor:C.card,borderRadius:20,padding:16,marginBottom:12,minHeight:115,borderWidth:1,borderColor:C.line},
  tileIcon:{fontSize:30},tileTitle:{fontSize:17,fontWeight:'900',color:C.dark,marginTop:7},tileSub:{fontSize:12,color:C.muted,marginTop:3},
  site:{backgroundColor:C.brown,borderRadius:20,padding:18},siteTitle:{color:'#FFF9EF',fontSize:18,fontWeight:'900'},siteSub:{color:'#EADCC7',marginTop:5},
  cam:{flex:1,backgroundColor:'#000'},cameraPreview:{zIndex:0},cameraOverlay:{zIndex:10,elevation:10},camTop:{paddingTop:52,paddingHorizontal:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  round:{width:48,height:48,borderRadius:24,backgroundColor:'rgba(30,20,10,.75)',alignItems:'center',justifyContent:'center'},roundTxt:{color:'#fff',fontSize:18,fontWeight:'900'},
  mode:{flexDirection:'row',backgroundColor:'#FFF9EF',borderRadius:22,padding:3},modeBtn:{paddingHorizontal:20,paddingVertical:9,borderRadius:19},active:{backgroundColor:C.gold},
  tools:{position:'absolute',top:120,left:14,gap:10},stamp:{position:'absolute',left:14,right:14,bottom:145,backgroundColor:'rgba(35,23,13,.86)',borderRadius:16,padding:12,flexDirection:'row'},
  stampSite:{color:'#F3D08A',fontWeight:'900',marginBottom:4},stampText:{color:'#fff',fontSize:11,marginBottom:3},watermark:{color:'#E5C07B',fontWeight:'900',fontSize:10},mini:{width:88,height:88,borderRadius:10},
  bottom:{position:'absolute',left:0,right:0,bottom:38,alignItems:'center',justifyContent:'center'},shutter:{width:78,height:78,borderRadius:39,backgroundColor:'#fff',alignItems:'center',justifyContent:'center',borderWidth:4,borderColor:'rgba(0,0,0,.25)'},
  shutterInner:{width:62,height:62,borderRadius:31,borderWidth:2,borderColor:C.brown},record:{width:76,height:76,borderRadius:38,backgroundColor:'#fff',alignItems:'center',justifyContent:'center'},
  recording:{backgroundColor:'#B3261E'},recordInner:{width:28,height:28,borderRadius:6,backgroundColor:'#B3261E'},audio:{position:'absolute',left:18,alignItems:'center'},audioTxt:{color:'#fff',fontWeight:'900'},audioSmall:{color:'#fff',fontSize:10},
  settings:{padding:18,paddingBottom:40},head:{flexDirection:'row',alignItems:'center',marginBottom:18},back:{fontSize:40,color:C.brown,marginRight:8},page:{fontSize:28,fontWeight:'900',color:C.dark},
  section:{fontSize:11,fontWeight:'900',letterSpacing:1.4,color:C.muted,marginTop:12,marginBottom:8},box:{backgroundColor:C.card,borderRadius:18,borderWidth:1,borderColor:C.line,overflow:'hidden',marginBottom:8,paddingBottom:1},
  row:{minHeight:54,paddingHorizontal:15,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:'#EDE2D3'},
  rowLabel:{fontSize:15,fontWeight:'700',color:C.dark},value:{fontSize:13,color:C.muted},inputs:{flexDirection:'row',gap:10,padding:14},input:{flex:1,backgroundColor:'#F7EEDF',borderRadius:12,padding:12},
  units:{flexDirection:'row',gap:8,paddingHorizontal:14,paddingBottom:14},unit:{paddingHorizontal:18,paddingVertical:9,borderRadius:20,backgroundColor:'#EADCC7'},activeUnit:{backgroundColor:C.gold},
  area:{fontSize:19,fontWeight:'900',color:C.brown,paddingHorizontal:14,paddingTop:3},map:{height:300,width:'100%'},measure:{padding:12,fontWeight:'800',color:C.brown},
  secondary:{margin:12,borderWidth:1,borderColor:C.gold,borderRadius:12,padding:11,alignItems:'center'},secondaryText:{color:C.brown,fontWeight:'900'},
  note:{fontSize:11,color:C.muted,lineHeight:16,marginTop:8},primary:{backgroundColor:C.brown,borderRadius:13,padding:13,alignItems:'center',marginTop:16},
  primaryText:{color:'#fff',fontWeight:'900'},center:{flex:1,alignItems:'center',justifyContent:'center',padding:30},link:{color:C.gold,fontWeight:'900',marginTop:14},
  muted:{color:C.muted,fontSize:12,lineHeight:18},gallery:{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:16},gitem:{width:'30%',aspectRatio:1,backgroundColor:C.card,borderRadius:14,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line},
  gicon:{fontSize:30},gtext:{fontSize:10,color:C.muted,marginTop:5},coord:{fontSize:12,color:C.brown,fontWeight:'700',marginTop:6}
});
