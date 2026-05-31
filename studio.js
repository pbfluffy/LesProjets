<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pum's Office — Studio UI Kit</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Syne:wght@600;700;800&family=JetBrains+Mono:wght@300;400;500;700&display=swap" rel="stylesheet">
<link href="studio.css" rel="stylesheet">
</head>
<body>
<div class="app">

  <!-- Header -->
  <header class="hero">
    <div class="hero-left">
      <div class="hero-mark"><img src="./assets/corgi.png" alt=""></div>
      <div>
        <h1 class="hero-title">PUM'S OFFICE</h1>
        <div class="hero-sub"><span class="dot"></span>the studio is open · everyone's working</div>
      </div>
    </div>
    <div class="console">
      <div class="dial" id="dial" title="day / night cycle">
        <span class="dial-glyph" id="dialGlyph">🌙</span>
        <span class="dial-dot" id="dialDot"></span>
      </div>
      <div class="console-sep"></div>
      <div>
        <div class="console-clock" id="clock">10:24</div>
        <div class="console-meta" id="date">BANGKOK</div>
      </div>
    </div>
  </header>

  <!-- Telemetry -->
  <div class="telemetry">
    <div class="tcell">
      <div class="tcell-label"><i></i>Status</div>
      <div class="tcell-value" id="statusVal">Working</div>
      <div class="tcell-sub" id="statusSub">2 of 2 on shift</div>
    </div>
    <div class="tcell floof">
      <div class="tcell-label"><i></i>Session</div>
      <div class="tcell-value" id="sessionVal">00:00<span class="u">elapsed</span></div>
      <div class="tcell-sub">since the studio opened</div>
    </div>
    <div class="tcell">
      <div class="tcell-label"><i></i>Tasks logged</div>
      <div class="tcell-value" id="tasksVal">0</div>
      <div class="tcell-sub" id="tasksSub">work-log entries today</div>
    </div>
    <div class="tcell idle floof" id="npCell">
      <div class="tcell-label"><i></i>Now playing</div>
      <div class="tcell-value" id="npVal" style="font-size:15px">— silent —</div>
      <div class="eq" id="eq"></div>
    </div>
  </div>

  <!-- Main grid -->
  <div class="grid">
    <div class="card stage-wrap">
      <div class="card-head" style="padding:0 0 10px;border:none">
        <div class="card-title"><span class="tri">▸</span> The Studio</div>
        <div class="card-meta" id="meta">working</div>
      </div>
      <div class="stage" id="stage">
        <img class="stage-bg" src="./assets/office.jpg" alt="studio">
        <!-- ambient + dog layers injected by JS -->
        <div class="vignette"></div>
        <div class="grain"></div>
      </div>
    </div>

    <div class="side">
      <div class="card">
        <div class="card-head"><div class="card-title">Crew</div><div class="card-meta">2 on shift</div></div>
        <div class="panel-body" id="crew"></div>
      </div>
      <div class="card">
        <div class="card-head"><div class="card-title">Work Log</div><div class="card-meta" id="logsrc">scripted</div></div>
        <div class="feed" id="feed" role="log" aria-live="polite" aria-relevant="additions" aria-label="studio work log"></div>
      </div>
    </div>
  </div>

  <!-- Control dock -->
  <div class="dock">
    <div class="dock-group">
      <button class="btn" id="toggleBtn"><span class="ic">⏸</span> Pause</button>
      <button class="btn" id="musicBtn"><span class="ic">♪</span> Music</button>
      <button class="btn" id="styleBtn"><span class="ic">⤮</span> Café Jazz</button>
    </div>
    <div class="dock-group">
      <button class="btn primary" id="aiBtn"><span class="ic">✦</span> Generate live log</button>
    </div>
  </div>

  <div class="footnote">your art, untouched · ambient fx + live work-log · © Pum's Office</div>
</div>

<script src="studio.js"></script>
</body>
</html>
