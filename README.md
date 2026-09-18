# Map Cam

Cross-platform Expo/React Native starter for a GPS camera focused on property/site documentation.

Included

* Photo and video camera modes
* Video audio ON/OFF
* GPS acquisition + reverse-geocoded address
* Location Lock
* GPS stamp preview with coordinates/date/heading/altitude
* Mini map in stamp
* Site Scaling: length × width, sq.ft/sq.m, sq.yd and cents conversion
* Map measurement: tap points, perimeter
* Beige / brown / gold visual theme
* Persistent settings with AsyncStorage

Run

1. Install Node.js LTS.
2. Install project dependencies with npm install.
3. Run npx expo start.
4. For native device builds:
    * npx expo run:android
    * npx expo run:ios

Important implementation note

The camera currently saves the original photo/video and renders the GPS stamp as a live preview overlay.

A production release should add a native image/video compositor to burn the stamp permanently into exported media while preserving the original.

Map measurements are approximate and are not a substitute for licensed land surveying.