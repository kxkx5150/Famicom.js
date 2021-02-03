let loopId = null;
const NES = new Nes("output");

// fetch("./free_roms/sp.nes")
//   .then((res) => res.arrayBuffer())
//   .then((arybuf) => {
//     setRom(arybuf);
//   });
document.getElementById("fileInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  var fileReader = new FileReader();
  fileReader.onload = function () {
    setRom(this.result);
  };
  fileReader.readAsArrayBuffer(file);
});
window.addEventListener(
  "resize",
  (e) => {
    setTimeout(() => {
      resizeCanvas();
    }, 1500);
  },
  true
);
window.addEventListener(
  "keydown",
  (e) => {
    checkKeyMap(e);
  },
  true
);
window.addEventListener(
  "keyup",
  (e) => {
    checkKeyMap(e, true);
  },
  true
);
const setRom = (arybuf) => {
  cancelAnimationFrame(loopId);
  const flg = NES.init(arybuf);
  if (flg) update();
};
const update = () => {
  NES.runFrames();
  loopId = requestAnimationFrame(update);
};
const ctrlMap1 = {
  arrowright: NES.INPUT.RIGHT,
  arrowleft: NES.INPUT.LEFT,
  arrowdown: NES.INPUT.DOWN,
  arrowup: NES.INPUT.UP,
  enter: NES.INPUT.START,
  shift: NES.INPUT.SELECT,
  z: NES.INPUT.B,
  a: NES.INPUT.A,
};
const ctrlMap2 = {
  l: NES.INPUT.RIGHT,
  j: NES.INPUT.LEFT,
  k: NES.INPUT.DOWN,
  i: NES.INPUT.UP,
  p: NES.INPUT.START,
  o: NES.INPUT.SELECT,
  t: NES.INPUT.B,
  g: NES.INPUT.A,
};
const checkKeyMap = (e, up) => {
  if (ctrlMap1[e.key.toLowerCase()] !== undefined) {
    if (up) {
      NES.keyUp(1, ctrlMap1[e.key.toLowerCase()]);
    } else {
      NES.keyDown(1, ctrlMap1[e.key.toLowerCase()]);
    }
    e.preventDefault();
  } else if (ctrlMap2[e.key.toLowerCase()] !== undefined) {
    if (up) {
      NES.keyUp(2, ctrlMap2[e.key.toLowerCase()]);
    } else {
      NES.keyDown(2, ctrlMap2[e.key.toLowerCase()]);
    }
    e.preventDefault();
    e.stopPropagation();
  }
};
resizeCanvas = () => {
  canvas = document.getElementById("output");
  const wh = window.innerHeight;
  const ww = window.innerWidth;
  const nw = 256;
  const nh = 240;
  const waspct = ww / wh;
  const naspct = nw / nh;

  if (waspct > naspct) {
    var val = wh / nh;
  } else {
    var val = ww / nw;
  }
  canvas.style.height = 240 * val - 50 + "px";
  canvas.style.width = 256 * val - 24 + "px";
};
setTimeout(() => {
  resizeCanvas();
}, 2000);
