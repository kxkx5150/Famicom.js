class Utils{
  getImage = (arybuf,canvas) =>{
    const NES_HEADER_SIZE = 0x0010;
    const PROGRAM_ROM_SIZE = 0x4000;
    const CHARACTOR_ROM_SIZE = 0x2000;
    const DEFAULT_CANVAS_WIDTH = 800;
    const PIXEL_RATIO = 2;

    const u8ary = new Uint8Array(arybuf);
    const program_rom_pages = u8ary[4];
    const character_rom_pages = u8ary[5];
    
    const spritesPerRow = DEFAULT_CANVAS_WIDTH / (8 * PIXEL_RATIO);
    const spritesNum = CHARACTOR_ROM_SIZE * character_rom_pages / 16;
    const rowNum = ~~(spritesNum / spritesPerRow) + 1;
    const height = rowNum * 8 * PIXEL_RATIO;
    const character_rom_start = NES_HEADER_SIZE + program_rom_pages * PROGRAM_ROM_SIZE;
    const character_rom_end = character_rom_start + character_rom_pages * CHARACTOR_ROM_SIZE;
    const crom = u8ary.slice(character_rom_start, character_rom_end - 1);

    canvas.width = DEFAULT_CANVAS_WIDTH;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = "rgb(0, 0, 0)";
    ctx.fillRect(0, 0, DEFAULT_CANVAS_WIDTH, height);
  
    const buildSprite = (spriteNum) => {
      const sprite = Array.apply(null, Array(8)).map((_) => [0,0,0,0,0,0,0,0]);
      for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 8; j++) {
          if (crom[spriteNum * 16 + i] & (0x80 >> j )) {
            sprite[i % 8][j] += 0x01 << (i / 8);
          }
        }
      }
      return sprite;
    }
    const renderSprite = (sprite, spriteNum) => {
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          ctx.fillStyle = `rgb(${85 * sprite[i][j]}, ${85 * sprite[i][j]}, ${85 * sprite[i][j]})`;
          const x = (j + (spriteNum % spritesPerRow) * 8) * PIXEL_RATIO;
          const y = (i + ~~(spriteNum / spritesPerRow) * 8) * PIXEL_RATIO;
          ctx.fillRect(x, y, PIXEL_RATIO, PIXEL_RATIO);
        }
      }
    };
  
    for(let i = 0; i < spritesNum; i++) {
      const sprite =  buildSprite(i);
      renderSprite(sprite, i);
    }
  }
}

