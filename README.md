![](logo.png)
this is a [complete](https://github.com/sogful/gddemo/commit/b5542726113a3000e3d958eb80ca979136c3c8f3) deobfuscation of the demo from [geometrydash.com](https://geometrydash.com). the code is split up into multiple js files, and the rest of the assets were also organized for a comfortable environment to work with.

<table>
  <tr>
    <td rowspan="2" width="100" valign="middle" align="middle">
      <img src="logowebdashers.svg" width="100px">
    </td>
    <td valign="top">
      <span>
        if you want to see this demo with other gamemodes, built-in levels and more, then you should consider joining the <b>web dashers</b> server where mods for this demo are made!
      </span>
    </td>
  </tr>
  <tr>
    <td align="right" valign="middle">
      <div>
        <span><sub><sup><sub><sup>they have the soggy mod by the way</sup></sub></sup></sub></span>
        <a href="https://discord.gg/h6xYNUBFnq"><img src="joindiscord.svg" width="150px"></a>
      </div>
    </td>
  </tr>
</table>

### running

- clone the repository:
   ```
   git clone https://github.com/sogful/gddemo.git
   cd gddemo
   ```
- install dependencies and build:
   ```
   npm install && npm run build
   ```
- run it in your browser:
   ```
   npx serve .
   ```
   (or ``python -m http.server`` / ``npx http-server``)

## code

- `src/game` - game-specific scenes and player code
  - `src/game/BootScene.js` & `src/game/LoadingScene.js` - asset loading and initial setup
  - `src/game/GameScene.js` - main game logic
  - `src/game/fun` - :trollface:
<br>

- `src/config` - easy to edit variables
- `src/dependencies` - modules required to run the game - phaser for rendering and pako for decompressing level data. <br>
  <sup>if you wish to use uncompressed level data instead (for some reason) then you will need neither pako nor the majority of LevelParser</sup>