# Super Game Boy Border Injector

This project contains allows to inject a custom Super Game Boy Border into (almost) any Game Boy ROM in the most possible user-friendly way.

It comes in two different implementations:

- Web implementation
- ASM implementation

Some amazing examples made with SGB Border Injector:

[![SGB border for Wink & the Broken Robot (homebrew)](https://github.com/marcrobledo/super-game-boy-border-injector/blob/main/examples/wink.png?raw=true)](https://maxoakland.itch.io/wink-gameboy)
[![SGB border for Kid Dracula (hack)](https://github.com/marcrobledo/super-game-boy-border-injector/blob/main/examples/kid_dracula.png?raw=true)](https://www.romhacking.net/hacks/8524/)
[![SGB border for Metroid II: Return of Samus](https://github.com/marcrobledo/super-game-boy-border-injector/blob/main/examples/metroid_2.png?raw=true)](https://www.romhacking.net/hacks/8548/)

- [Wink & the Broken Robot](https://maxoakland.itch.io/wink-gameboy) (homebrew) by [Max Oakland](https://twitter.com/WinkWinkerson)
- [Kid Dracula](https://www.romhacking.net/hacks/8524/) (hack) by [Kensuyjin_33](https://twitter.com/Kensuyjin_33/)
- [Metroid II: Return of Samus](https://www.romhacking.net/hacks/8548/) (hack) by [Ryallasha N'vetay](https://twitter.com/Ryallasha)

## Web implementation

This is probably what everyone is looking for: a simple [web app](https://www.marcrobledo.com/super-game-boy-border-injector/) that does the magic for you!

Just select your desired ROM and Super Game Boy border data and the app will build the SGB compatible ROM with your border and even custom palette.

You might probably need [Super Game Boy Border Converter](https://github.com/marcrobledo/super-game-boy-border-converter/), which will convert any image to the needed data the injector asks for.

This web injector just automatizes the process of injecting the assembled code from the ASM implementation below.

## ASM implementation

This [RGBDS](https://github.com/gbdev/rgbds) skeleton project allows you to inject a custom Super Game Boy Border to any Game Boy ROM.

Thanks to [xenophile](https://github.com/xenophile127), [Imanol Barriuso](https://github.com/imanolea) and [nitro2k01](https://github.com/nitro2k01) for their help!

### How to compile

1. Get [RGBDS](https://rgbds.gbdev.io/install) and unzip it at `rgbds` folder.
2. Place the game you are going to patch as `roms/input.gb` file.
3. Place `sgb_map.bin`, `sgb_tiles.bin` and `sgb_palettes.bin` in `src/`.
4. Read `src/settings.asm` carefully and edit it, filling all needed offsets and constants for your game.
5. Compile with `assemble.bat` (Windows) or `assemble.sh` (Unix).
6. If there were no errors, a ROM `roms/output.gb` will be created.
