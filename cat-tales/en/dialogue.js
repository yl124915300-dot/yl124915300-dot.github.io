/* Cat Tales English: careful, evidence-based owner/cat conversations.
 * The agent never claims to translate meows, diagnose a cat, or observe media it has not processed. */
(function(root){
  "use strict";
  const nameSafe = input => String(input || "your cat").trim().slice(0, 40) || "your cat";
  const has = (text, terms) => terms.some(t => text.includes(t));
  function detectScene(text) {
    if (/\b(door|hallway|front door|outside|exit)\b/i.test(text)) return "door";
    if (/\b(bowl|food dish|food bowl|kibble|feeder)\b/i.test(text)) return "bowl";
    if (/\b(toy|wand|laser pointer|plaything)\b/i.test(text)) return "toy";
    if (/\b(window|bird feeder|balcony)\b/i.test(text)) return "window";
    if (/\b(bed|nap|sleeping|resting)\b/i.test(text)) return "rest";
    return "";
  }
  function createMemory(){return {scene:"",feeding:"",lastTopic:"",turnCount:0};}
  function updateMemory(prev,text,result){
    const memory=Object.assign(createMemory(),prev||{});
    const q=String(text||"").toLowerCase();
    const scene=detectScene(q);
    if(scene)memory.scene=scene;
    if(/\b(just ate|already ate|just fed|fed (him|her|them)|after eating)\b/.test(q))memory.feeding="recent";
    if(/\b(hungry|before dinner|before breakfast|mealtime|not fed yet)\b/.test(q))memory.feeding="due";
    if(result?.type==="urgent")memory.lastTopic="urgent";
    else if(result?.type==="stop")memory.lastTopic="stop";
    else if(result?.type==="vision")memory.lastTopic="vision";
    else if(result?.type==="sound")memory.lastTopic="sound";
    else if(result?.type==="motion")memory.lastTopic="motion";
    else if(result?.type==="food")memory.lastTopic="food";
    else if(scene)memory.lastTopic=scene;
    memory.turnCount=Math.min(1000,(memory.turnCount||0)+1);
    return memory;
  }
  function shouldHandleTranscript(text){
    const q=String(text||"").trim().replace(/[.!?,;:~\s]/g,"");
    if(q.length<5)return false;
    if(/^(meow|mew|miaow|purr|woof|bark|hiss)+$/i.test(q))return false;
    return true;
  }
  function respond(input,ctx={},sound=null,memory={},vision=null){
    const q=String(input||"").trim().toLowerCase().slice(0,700);
    const cat=nameSafe(ctx.name);
    const scene=ctx.scene||memory.scene||detectScene(q);
    const feeding=ctx.feeding||memory.feeding||"";
    const behavior=ctx.behavior||"";
    if(!q)return {type:"abstain",answer:"Tell me something you actually noticed about your cat: a sound, a place, or a change in behavior."};
    if(/\b(can't (pee|urinate|breathe)|cannot (pee|urinate|breathe)|unable to (pee|urinate|breathe)|straining to (pee|urinate)|difficulty breathing|open.mouth breathing|panting heavily|choking|seizure|convulsion|collapsed|unresponsive|severe injury|bleeding heavily|blood in urine|not breathing|trouble breathing)\b/i.test(q)){
      return {type:"urgent",answer:"This could be urgent. Please contact an emergency veterinarian now. I can't assess or diagnose medical problems from this chat. Avoid delaying care to test the app."};
    }
    if(/\b(hiss|hissing|growl|growling|attacked|aggressive|scared|terrified|hiding|trying to escape|ears pinned)\b/i.test(q)||behavior==="hide"){
      return {type:"stop",answer:cat+" may be uncomfortable or asking for space. Stop the interaction, give them a clear way to leave, and observe from a distance. If this is new or persistent, consider asking a veterinarian."};
    }
    const askingMotion=/\b(mov(e|ing|ed)|walk|walking|position|follow(ed|ing)?|turn(ed|ing)?)\b/.test(q)&&
      /\b(camera|video|frame|see|detect|notice|on screen|in the picture)\b/.test(q);
    if(askingMotion){
      if(!vision?.verified)return {type:"motion",answer:"I don't have a fresh, verified camera detection. You can enable the optional on-device camera analysis, or describe what you saw. A preview alone doesn't count as visual evidence."};
      if(vision.motionStatus==="frame_position_shift"){
        return {type:"motion",answer:"A cat-shaped detection box shifted position across recent frames. That could be the cat, the camera, or detection noise—so it does not prove walking or a response. Did you move the phone?"};
      }
      return {type:"motion",answer:"I don't have reliable evidence of a meaningful position shift. Even a stationary detection box can't prove the cat stayed completely still."};
    }
    if(/\b(camera|video|see (a |my |the )?cat|can you see|visible|visual|picture|frame|on screen)\b/.test(q)){
      if(!vision?.verified)return {type:"vision",answer:"I haven't received a verified visual detection. Turn on the camera and separately choose on-device detection if you wish; you can always just describe what you saw."};
      if(vision.catCandidate)return {type:"vision",answer:"The on-device detector flagged a possible cat in consecutive frames. This is object detection only—it doesn't prove the cat meowed or tell us how it feels."};
      if(vision.dogCandidate)return {type:"vision",answer:"The detector has a dog-shaped object candidate but no stable cat candidate yet. Lighting, angle and occlusion can all affect results."};
      return {type:"vision",answer:"No stable cat-shaped object has been detected in the latest frames. This doesn't establish that there is no cat nearby."};
    }
    if(/\b(what sound|heard|hearing|is that a cat|sound model|audio model|the noise|detect(ed)? (a )?meow)\b/.test(q)){
      if(sound?.verified){
        const type=sound.catCandidate?"a possible cat vocalization":"an audio category of "+String(sound.label||"unknown").slice(0,38);
        return {type:"sound",answer:"The optional on-device audio classifier flagged "+type+". It's only a research candidate, not a verified sound source or a translation. What did you see your cat doing at the time?"};
      }
      return {type:"sound",answer:"No verified sound-classifier result is available yet. The microphone for talking with me doesn't automatically classify a cat's sounds."};
    }
    if(/\b(what does (it|that|the meow) mean|translate|cat language|meow means|saying to me|why (is|does|did) .*meow|why .*cry|meowing)\b/.test(q)){
      if(feeding==="recent"||/\b(just ate|already ate)\b/.test(q)){
        return {type:"food",answer:"Since "+cat+" recently ate, another meal isn't the first assumption. They might be asking for attention, checking a routine, or reacting to something nearby. Try watching what they do next without offering extra food just to test."};
      }
      if(scene==="door")return {type:"cue",answer:"Being near a door may relate to a routine, curiosity, or wanting access. I can't translate the meow itself. Watch where "+cat+" looks and whether they lead you somewhere; don't open an unsafe exit."};
      return {type:"cue",answer:"A meow isn't a sentence I can translate. Let's explore the context: where was "+cat+", what happened just before, and what did they choose to do afterward?"};
    }
    if(/\b(then what|what next|and then|what should i do next|next step)\b/.test(q)){
      if(memory.lastTopic==="food"||feeding==="recent")return {type:"cue",answer:"For the next minute, observe without adding food: does "+cat+" approach you, head toward a door, play, or settle? Their choice is more informative than another guess."};
      if(memory.lastTopic==="stop")return {type:"stop",answer:"Give "+cat+" space and don't force more interaction. If you're worried about a sudden behavior change, consult a veterinarian."};
      return {type:"cue",answer:"Try one gentle, optional interaction—like sitting quietly nearby—and see whether "+cat+" approaches or walks away. Either response is useful context; don't force a test."};
    }
    if(/\b(how (can|do) i (call|invite|get) .* (over|come)|come here|call my cat|train my cat)\b/.test(q)){
      return {type:"cue",answer:"Try saying "+cat+"'s name softly once, then pause. Reward voluntary interest; if they choose to ignore you or leave, respect that. Don't play distress sounds to provoke a reaction."};
    }
    if(scene==="bowl"||feeding==="due"){
      return {type:"food",answer:"Food routines might matter here, but a location near the bowl isn't proof of hunger. Check the usual feeding schedule and whether fresh water is available, then watch "+cat+"'s next voluntary move."};
    }
    if(scene==="toy"||behavior==="play")return {type:"cue",answer:"You could invite "+cat+" to play briefly with a familiar toy. Pause often and let them decide whether to join or leave. A toy nearby alone doesn't prove they want to play."};
    if(scene==="window")return {type:"cue",answer:"Something outside might have caught "+cat+"'s attention. Keep windows secure and observe quietly, without forcing an interaction."};
    if(scene==="rest")return {type:"cue",answer:"If "+cat+" is resting, the safest response may be to let them rest. Watch for their own invitation to interact."};
    if(/\b(hi|hello|hey|good morning|who are you)\b/.test(q))return {type:"intro",answer:"Hi! I'm Cat Tales, your cat-observation companion. Tell me what "+cat+" did, and we'll explore gentle possibilities together—not pretend to translate cat language."};
    return {type:"cue",answer:"Tell me where "+cat+" was, what happened right before, and what you noticed afterward. I'll offer one gentle possibility while keeping the uncertainty clear."};
  }
  const api={createMemory,updateMemory,shouldHandleTranscript,respond};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  root.CatTalesEnDialogue=api;
})(typeof window!=="undefined"?window:globalThis);
