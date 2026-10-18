/* Cat Tales Live: optional, on-device MediaPipe YAMNet sound-event candidate worker.
   Never interprets cat intention and does not record audio. */
let classifier = null;
let busy = false;
const modelURL = new URL("./vendor/yamnet.tflite", self.location.href).href;
const wasmURL = new URL("./vendor/wasm", self.location.href).href;
const esmURL = new URL("./vendor/audio_bundle.mjs", self.location.href).href;
self.onmessage = async (event) => {
  const d = event.data || {};
  if(d.type === "init") {
    if(classifier) { self.postMessage({type:"ready"}); return; }
    try {
      const kit = await import(esmURL);
      const fileset = await kit.FilesetResolver.forAudioTasks(wasmURL);
      // MediaPipe audio's module-worker loading can fail to register ModuleFactory.
      // Preload pinned same-origin WASM glue in this isolated worker, then skip duplicate loader.
      if(fileset.wasmLoaderPath && !self.ModuleFactory) {
        const glue = await fetch(fileset.wasmLoaderPath, {cache:"force-cache"});
        if(!glue.ok)throw Error("MediaPipe WASM glue HTTP "+glue.status);
        (0,eval)(await glue.text());
        if(!self.ModuleFactory)throw Error("WASM glue loaded but ModuleFactory absent");
        delete fileset.wasmLoaderPath;
      }
      classifier = await kit.AudioClassifier.createFromOptions(fileset, {
        baseOptions: {modelAssetPath:modelURL},
        maxResults:30
      });
      self.postMessage({type:"ready",model:"YAMNet AudioSet / MediaPipe"});
    } catch(e) {
      self.postMessage({type:"error",message:"声音模型加载失败："+String(e&&e.message||e).slice(0,230)});
    }
    return;
  }
  if(d.type==="chunk" && classifier && !busy && d.samples && Number.isFinite(d.sampleRate)) {
    busy = true;
    try {
      const samples = new Float32Array(d.samples);
      const r = classifier.classify(samples, d.sampleRate);
      const list = Array.isArray(r) ? r : [r];
      const top = (list[0] && list[0].classifications && list[0].classifications[0] &&
        list[0].classifications[0].categories || [])
        .filter(x=>x && Number.isFinite(x.score))
        .map(x=>({label: String(x.categoryName||x.displayName||"unknown"), score:Number(x.score)}))
        .sort((a,b)=>b.score-a.score);
      const catSet = new Set(["cat","meow","purr","caterwaul"]);
      const negativeSet = new Set(["dog","bark","speech","conversation","narration, monologue","music","alarm","clock"]);
      const candidate = top[0] || null;
      const catTop = !!(candidate && catSet.has(candidate.label.trim().toLowerCase()) && candidate.score >= 0.40);
      const negMax = top.filter(x=>negativeSet.has(x.label.trim().toLowerCase())).reduce((m,x)=>Math.max(m,x.score),0);
      self.postMessage({type:"result",top:top.slice(0,6),catTop:catTop&&negMax<0.35,model:"YAMNet",stamp:Date.now()});
    } catch(e) {
      self.postMessage({type:"error",message:"音频推理失败："+String(e&&e.message||e).slice(0,230)});
    } finally {busy=false;}
  }
};