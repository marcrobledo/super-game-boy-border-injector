; Super Game Boy border injector
; by Marc Robledo 2024
; ------------------------------------------------------------------------------------
; see README file


INCLUDE "hardware.inc" ;https://github.com/gbdev/hardware.inc

MACRO RGB
	DW (\3 << 10 | \2 << 5 | \1)
ENDM

INCLUDE "settings.asm"





; ---------------- HEADER ----------------
SECTION "Header - Set SGB mode", ROM0[$0146]
DB CART_INDICATOR_SGB
SECTION "Header - Old licensee code", ROM0[$014b]
DB $33



; ----------------- ROM -----------------
; hook game's boot and execute our boot_hook subroutine beforehand
SECTION "ROM - Entry point", ROM0[$0100]
nop
;jp		boot_original
jp		boot_hook

SECTION "ROM - Original game boot", ROM0[GAME_BOOT_OFFSET]
boot_original:


SECTION "ROM - Bank 0 free space", ROM0[BANK0_FREE_SPACE]
boot_hook:
	push	af

	ld		a, BANK(sgb_init)
	ld		[rROMB0], a

	call	sgb_init

	ld		[rROMB0], a
	pop		af
	jp		boot_original


; MACROS
;https://gbdev.io/pandocs/SGB_Command_Summary.html
MACRO SGB_COMMAND
	;parameter 0: command
	;parameter 1: command parameter

	DB (\1 << 3) + 1 ;all common SGB commands are length=1
	IF _NARG == 2
		DB \2
	ELSE
		DB 0
	ENDC
	DS 14
ENDM
MACRO SGB_COMMAND_PAL_SET
	DB ($0a << 3) + 1 ;PAL_SET(0, 1, 2, 3), length=1
	DW \1
	DW \2
	DW \3
	DW \4
	DB $00 ;attribute
	DS 6
ENDM



SECTION "SGB Bank - Code", ROMX[$4000], BANK[SGB_CODE_BANK]
; borrowed and adapted from https://imanoleasgames.blogspot.com/2016/12/games-aside-1-super-game-boy.html
sgb_init:
	ld		a, c
	cp		$14
	jr		nz, .end ;not in SGB mode, return

	push	bc
	push	de
	push	hl

	di

	; freeze GB screen to avoid garbled graphics being shown when transfering later to VRAM
	ld		hl, SGB_COMMAND_FREEZE_SCREEN
	call	sgb_packet_transfer

	; according to official documentation, these 8 data packets need to be sent
	ld		hl, SGB_INIT_PACKET0
	call	sgb_packet_transfer
	ld		hl, SGB_INIT_PACKET1
	call	sgb_packet_transfer
	ld		hl, SGB_INIT_PACKET2
	call	sgb_packet_transfer
	ld		hl, SGB_INIT_PACKET3
	call	sgb_packet_transfer
	ld		hl, SGB_INIT_PACKET4
	call	sgb_packet_transfer
	ld		hl, SGB_INIT_PACKET5
	call	sgb_packet_transfer
	ld		hl, SGB_INIT_PACKET6
	call	sgb_packet_transfer
	ld		hl, SGB_INIT_PACKET7
	call	sgb_packet_transfer

	; transfer border tile data (first 128 tiles)
	ld		de, SGB_COMMAND_TRANSFER_BG_TILES00
	ld		hl, _data_sgb_border_tiles
	call	mem_copy_sgb_4kb

	; transfer border tile data (last 128 tiles)
	ld		de, SGB_COMMAND_TRANSFER_BG_TILES80
	ld		hl, _data_sgb_border_tiles + 128*32
	call	mem_copy_sgb_4kb

	; transfer border map (32x28 map(tile indexes + attributes) + 4 palettes)
	ld		de, SGB_COMMAND_TRANSFER_BORDER
	ld		hl, _data_sgb_border_map
	call	mem_copy_sgb_4kb

	; transfer 512 game colors to SGB system palette
	ld		hl, _data_sgb_game_palettes
	ld		de, SGB_COMMAND_TRANSFER_PALETTES
	call	mem_copy_sgb_4kb
	; set game palettes to colors 0, 1, 2 and 3 from previous SGB system palette transfered colors
	ld		de, SGB_COMMAND_SET_PALETTES_DEFAULT
	IF DEF(CUSTOM_GB_PALETTE_ENABLED)
		call	sgb_packet_transfer
	ELSE
		REPT 3
			nop
		ENDR
	ENDC

	; freeze GB screen rendering
	ld		hl, SGB_COMMAND_UNFREEZE_SCREEN
	call	sgb_packet_transfer

	pop		hl
	pop		de
	pop		bc
.end:
	ld		a, 1 ;restore MBC initial mapped bank
	ret





; @param: de - packet offset
; @param: hl - data
mem_copy_sgb_4kb:
	ld		bc, 4096
mem_copy_sgb:
	di
	push	de ;store packet offset

	call	lcd_off
	ld		a, %11100100
	ldh		[rBGP], a ;needed VRAM-transfer background palette value

	ld		de, _VRAM8800
	call	mem_copy ;safe copy 4KB of data to $8800

	; build _SCRN0 visible map with $80, $81, $82... which will be later transfered to SNES VRAM
	ld		hl, _SCRN0
	ld		de, SCRN_VX_B-SCRN_X_B ;32-20=12
	ld		a, $80
	ld		c, 13 ;13*20=260 > 256
.loop_row:
	ld		b, SCRN_X_B ;20
.loop_col:
	ld		[hli], a
	inc		a
	dec		b
	jr		nz, .loop_col

	add		hl, de ;reached last column, continue to next row
	dec		c
	jr		nz, .loop_row

.finished:

	ld		a, LCDCF_ON|LCDCF_BG8800|LCDCF_BG9800|LCDCF_BGON|LCDCF_OBJ16|LCDCF_OBJOFF|LCDCF_WIN9C00|LCDCF_WINOFF
	ldh		[rLCDC], a

	pop		hl ;restore packet offset
	call	sgb_packet_transfer

	xor		a
	ldh		[rBGP], a ;set BG palette to blank
	ret



; @param: hl - packet offset
sgb_packet_transfer:
	ld		a, [hl]
	and		%00000111					; The three lower bits indicate the number of packets to send
	ret		z							; We return if there are no packets to send
	ld		b, a						; We store the number of packets to send
.sgb_packet_transfer_0:
	push	bc
	xor		a
	ld		[rP1], a					; Initial pulse (Start write). P14 = LOW and P15 = LOW
	ld		a, P1F_4 | P1F_5
	ld		[rP1], a					; P14 = HIGH and P15 = HIGH between pulses
	ld		b, 16						; Number of bytes per packet
.sgb_packet_transfer_1:
	ld		e, 8						; Bits per byte
	ld		a, [hli]
	ld		d, a						; Next byte of the packet
.sgb_packet_transfer_2:
	bit		0, d
	ld		a, P1F_4					; P14 = HIGH and P15 = LOW (Write 1)
	jr		nz, .sgb_packet_transfer_3
	ld		a, P1F_5					; P14 = LOW and P15 = HIGH (Write 0)
.sgb_packet_transfer_3:
	ld		[rP1], a					; We send one bit
	ld		a, P1F_4 | P1F_5
	ld		[rP1], a					; P14 = HIGH and P15 = HIGH between pulses
	rr		d							; We rotate the register so that the next bit goes to position 0
	dec		e
	jr		nz, .sgb_packet_transfer_2	; We jump while there are bits left to be sent
	dec		b
	jr		nz, .sgb_packet_transfer_1	; We jump while there are bytes left to be sent
	ld		a, P1F_5
	ld		[rP1], a					; Bit 129, stop bit (Write 0)
	ld		a, P1F_4 | P1F_5
	ld		[rP1], a					; P14 = HIGH and P15 = HIGH between pulses

	call	sgb_packet_transfer_wait	; 280024 clock cycles are consumed (66.768646240234375 milliseconds) at 4.194304 mhz + 24 cycles from call

	pop	 bc
	dec	 b
	ret	 z
	jr	  .sgb_packet_transfer_0	; We jump while there are packets left to be sent

; 280024 clock cycles are consumed
sgb_packet_transfer_wait:
	ld		de, 7000			; 12 cycles
.loop_wait:
	nop							; 4 cycles
	nop							; 4 cycles
	nop							; 4 cycles
	dec		de					; 8 cycles
	ld		a, d				; 4 cycles
	or		e					; 4 cycles
	jr		nz, .loop_wait		; 12 cycles if jumps, 8 if not
	ret							; 16 cycles

; useful subroutines
lcd_off:
	ldh		a, [rLCDC]
	rlca
	ret		nc ;return if LCD is already off

	di
.wait_vblank: ;wait for VBlank interruption
	ldh		a, [rLY]
	cp		SCRN_Y + 1
	jr		nz, .wait_vblank

	ldh		a, [rLCDC]
	res		7, a
	ldh		[rLCDC], a			; We turn off the LCD
	ret

mem_copy:
	ld		a, [hli]
	ld		[de], a
	inc		de
	dec		bc
	ld		a, c
	or		b
	jr		nz,	mem_copy
	ret

;SGB PACKETS
;initialization SGB packets
SGB_INIT_PACKET0:
DB $79, $5d, $08, $00, $0b, $8c, $d0, $f4, $60, $00, $00, $00, $00, $00, $00, $00 ;official documentation?
;DB $79, $5d, $08, $00, $0b, $04, $d0, $f4, $60, $00, $00, $00, $00, $00, $00, $00 ;Mega Man V?
SGB_INIT_PACKET1:
DB $79, $52, $08, $00, $0b, $a9, $e7, $9f, $01, $c0, $7e, $e8, $e8, $e8, $e8, $e0
SGB_INIT_PACKET2:
DB $79, $47, $08, $00, $0b, $c4, $d0, $16, $a5, $cb, $c9, $05, $d0, $10, $a2, $28
SGB_INIT_PACKET3:
DB $79, $3c, $08, $00, $0b, $f0, $12, $a5, $c9, $c9, $c8, $d0, $1c, $a5, $ca, $c9
SGB_INIT_PACKET4:
DB $79, $31, $08, $00, $0b, $0c, $a5, $ca, $c9, $7e, $d0, $06, $a5, $cb, $c9, $7e
SGB_INIT_PACKET5:
DB $79, $26, $08, $00, $0b, $39, $cd, $48, $0c, $d0, $34, $a5, $c9, $c9, $80, $d0
SGB_INIT_PACKET6:
DB $79, $1b, $08, $00, $0b, $ea, $ea, $ea, $ea, $ea, $a9, $01, $cd, $4f, $0c, $d0
SGB_INIT_PACKET7:
DB $79, $10, $08, $00, $0b, $4c, $20, $08, $ea, $ea, $ea, $ea, $ea, $60, $ea, $ea




SGB_COMMAND_FREEZE_SCREEN:
	SGB_COMMAND $17, 1 ;MASK_EN(1) - freeze screen

SGB_COMMAND_UNFREEZE_SCREEN:
	SGB_COMMAND $17, 0 ;MASK_EN(0) - unfreeze screen

SGB_COMMAND_TRANSFER_BG_TILES00:
	SGB_COMMAND $13, 0 ;CHR_TRN(0) - tiles $00-$7f

SGB_COMMAND_TRANSFER_BG_TILES80:
	SGB_COMMAND $13, 1 ;CHR_TRN(1) - tiles $80-$ff

SGB_COMMAND_TRANSFER_BORDER:
	SGB_COMMAND $14 ;PCT_TRN()

SGB_COMMAND_TRANSFER_PALETTES:
	SGB_COMMAND $0b ;PAL_TRN()

SGB_COMMAND_SET_PALETTES_DEFAULT:
	SGB_COMMAND_PAL_SET 0, 1, 2, 3 ;PAL_SET(0, 1, 2, 3)

SECTION "SGB Bank - Border data - Map & palettes", ROMX[$5300], BANK[SGB_CODE_BANK]
_data_sgb_border_map:
;border map=2048 bytes
INCBIN "sgb_border_map.bin"	;rows 0-27
DS 32 * 2 * 4				;rows 28-31: unused, row 28 should be blank to avoid strange scanline flickering when fading in/out border
;border palettes=32 bytes (1 pal), 64 bytes (2 pals), 96 bytes (3 pals), 128 bytes (4 pals, bad results in emulators)
INCBIN "sgb_border_palettes.bin"


SECTION "SGB Bank - Border data - Tiles", ROMX[$5c00], BANK[SGB_CODE_BANK]
_data_sgb_border_tiles:
INCBIN "sgb_border_tiles.bin"








SECTION "SGB Bank - Border data - Game palettes", ROMX[$7c00], BANK[SGB_CODE_BANK]
;user can define up to 512 colors available in SGB
_data_sgb_game_palettes:
    BUILD_CUSTOM_GB_PALETTE
