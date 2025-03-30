/*
	These classes represent different videogame console's 8x8 tiles data, maps and palettes
	to be used in future apps :-P
	
	by Marc Robledo 2022-2025
*/

class Palette{
	colors;
	
	constructor(size){
		this.colors=new Array(size);
		for(var i=0; i<this.colors.length; i++)
			this.colors[i]=new ColorRGB15(0, 0, 0);
	}

	getColorIndex(color){
		for(var i=0; i<this.colors.length; i++){
			if(this.colors[i].equals(color))
				return i;
		}
		return -1;
	}

	hasColor(color){
		return this.getColorIndex(color)!==-1;
	}

	hasColors(colors){
		for(var i=0; i<colors.length; i++){
			if(!this.hasColor(colors[i]))
				return false;
		}
		return true;
	}
	
	export(){
		return this.colors.map((color) => {
			return color.data;
		});
	}

	static import(words){
		var size=words.length;
		if((Math.log(size)/Math.log(2)) % 1 !== 0)
			throw new Error('Invalid palette size');

		var palette=new Palette(size);
		for(var i=0; i<words.length; i++){
			palette.colors[i]=ColorRGB15.import(words[i]);
		}
		return palette;
	}
}
export class PaletteGB extends Palette{
	constructor(){
		super(4);
	}
}
export class PaletteSNES extends Palette{
	constructor(){
		super(16);
	}
}





const RESCALE_24TO15BIT=8.22580645161291;
const BIT5_MASK=0x1f;
export class ColorRGB15{
	r8;
	g8;
	b8;
	
	#r;
	#g;
	#b;
	
	data;

	constructor(r8, g8, b8){
		this.r8=r8;
		this.g8=g8;
		this.b8=b8;
		this.#r=ColorRGB15.to5bit(r8);
		this.#g=ColorRGB15.to5bit(g8);
		this.#b=ColorRGB15.to5bit(b8);

		this.data=(this.#b << 10) + (this.#g << 5) + this.#r;
	}


	equals(color2){
		return this.data===color2.data;
	}


	static to5bit(component8){
		return Math.round(component8/RESCALE_24TO15BIT) & BIT5_MASK
	}
	static to8bit(component5){
		return Math.round(component5*RESCALE_24TO15BIT);
	}

	static import(word){
		return new ColorRGB15(
			ColorRGB15.to8bit(word & BIT5_MASK),
			ColorRGB15.to8bit((word >>> 5) & BIT5_MASK),
			ColorRGB15.to8bit((word >>> 10) & BIT5_MASK)
		);
	}
}


















const FLIP_NONE=0b00000000;
const FLIP_X=0b00000001;
const FLIP_Y=0b00000010;
const FLIP_XY=FLIP_X | FLIP_Y;
const COL_MASK=[0x80, 0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01];
const COL_MASK_NEG=[0x7f, 0xbf, 0xdf, 0xef, 0xf7, 0xfb, 0xfd, 0xfe];


/**
 * Represents a 8x8 tile
 * @constructor
 * @param {int} bpp - bits per pixel
*/
class Tile{
	data;
	#flippedTiles;
	#bpp;

	constructor(bpp){
		this.#bpp=bpp;
		this.data=new Array(bpp * 8);
		for(var i=0; i<this.data.length; i++){
			this.data[i]=0;
		}
	}

	toImageData(palette, flipX = false, flipY = false, transparent = false){
		var imageData=new ImageData(8, 8);
		var k=0;
		for(var i=0; i<8; i++){
			for(var j=0; j<8; j++){
				var x=flipX? 7-j : j;
				var y=flipY? 7-i : i;
				var colorIndex=this.getPixel(y, x);
				imageData.data[k++]=palette.colors[colorIndex].r8;
				imageData.data[k++]=palette.colors[colorIndex].g8;
				imageData.data[k++]=palette.colors[colorIndex].b8;
				imageData.data[k++]=colorIndex || !transparent? 255 : 0;
			}
		}
		return imageData;
	}
	
	#buildFlippedData(){
		this.#flippedTiles=new Array(4);
		this.#flippedTiles[FLIP_NONE]=this.data;

		this.#flippedTiles[FLIP_X]=new this.constructor();
		this.#flippedTiles[FLIP_Y]=new this.constructor();
		this.#flippedTiles[FLIP_XY]=new this.constructor();

		for(var y=0; y<8; y++){
			for(var x=0; x<8; x++){
				this.#flippedTiles[FLIP_X].setPixel(y, x, this.getPixel(y, 7-x));
				this.#flippedTiles[FLIP_Y].setPixel(y, x, this.getPixel(7-y, x));
				this.#flippedTiles[FLIP_XY].setPixel(y, x, this.getPixel(7-y, 7-x));
			}
		}

		this.#flippedTiles[FLIP_X]=this.#flippedTiles[FLIP_X].data;
		this.#flippedTiles[FLIP_Y]=this.#flippedTiles[FLIP_Y].data;
		this.#flippedTiles[FLIP_XY]=this.#flippedTiles[FLIP_XY].data;
	}
	
	equals(tile){
		if(!this.#flippedTiles)
			this.buildFlippedData();

		for(var i=0; i<this.#flippedTiles.length; i++){
			var found=true;
			for(var j=0; j<this.data.length && found; j++){
				if(this.data[j]!==tile.data[j])
					found=false;
			}
			if(found){
				return 0x80 | i;
			}
		}
		return false;
	}
	
	static import(bytes){
		var tile=new this();
		for(var i=0; i<bytes.length; i++){
			tile.data[i]=bytes[i];
		}
		return tile;
	}
}
export class Tile2BPP extends Tile{
	constructor(){
		super(2);
	}

	getPixel(row, col){
		return(
			((this.data[Math.floor(row*2) + 1] & COL_MASK[col]) << 1) +
			((this.data[Math.floor(row*2)] & COL_MASK[col]))
		) >> 7-col;
	}
	
	setPixel(row, col, colorIndex){
		this.data[(row*2)]=(this.data[(row*2)] & COL_MASK_NEG[col]) | ((colorIndex & 0x01) << (7-col));
		this.data[(row*2) + 1]=(this.data[(row*2) + 1] & COL_MASK_NEG[col]) | ((colorIndex >>> 1) << (7-col));
	}
}
export class Tile4BPP extends Tile{
	constructor(){
		super(4);
	}

	getPixel(row, col){
		return(
			((this.data[Math.floor(row*2) + 16 + 1] & COL_MASK[col]) << 3) +
			((this.data[Math.floor(row*2) + 16] & COL_MASK[col]) << 2) +
			((this.data[Math.floor(row*2) + 1] & COL_MASK[col]) << 1) +
			((this.data[Math.floor(row*2)] & COL_MASK[col]))
		) >> 7-col;
	}
	
	setPixel(row, col, colorIndex){
		this.data[(col*2)]=(this.data[(col*2)] & COL_MASK_NEG[row]) | ((colorIndex & 0x01) << (7-row));
		this.data[(col*2) + 1]=(this.data[(col*2) + 1] & COL_MASK_NEG[row]) | (((colorIndex >>> 1) & 0x01) << (7-row));

		this.data[(col*2) + 16]=(this.data[(col*2) + 16] & COL_MASK_NEG[row]) | (((colorIndex >>> 2) & 0x01) << (7-row));
		this.data[(col*2) + 17]=(this.data[(col*2) + 16 + 1] & COL_MASK_NEG[row]) | (((colorIndex >>> 3) & 0x01) << (7-row));
	}
}


export class Tileset{
	static import(tileClass, tileData){
		var tiles=new Array(tileData.length);
		for(var i=0; i<tileData.length; i++){
			tiles[i]=tileClass.import(tileData[i]);
		}
		return tiles;
	}
}




class Map{
	_width;
	_height;
	_tileIndexes;
	_attributes;

	constructor(w, h){
		this._width=w;
		this._height=h;
		this._tileIndexes=new Array(w * h);
		this._attributes=new Array(w * h);
	}

	getTile(x, y){
		return this._tileIndexes[y * this._width + x];
	}
	getAttribute(x, y, parse){
		if(parse){
			return this.parseAttributeByte(this.getAttribute(x, y, false));
		}else{
			return this._attributes[y * this._width + x];
		}
	}
	getMaxTileIndex(){
		return Math.max(...this._tileIndexes) + 1;
	}
	getMaxPaletteIndex(){
		return Math.max(...this._attributes.map((attr) => {
			return this.constructor.parseAttributeByte(attr).paletteIndex;
		})) + 1;
	}

	toImageData(tiles, palettes, transparent = false){
		var canvas=document.createElement('canvas');
		canvas.width=this._width*8;
		canvas.height=this._height*8;
		var ctx=canvas.getContext('2d');

		var index=0;
		for(var y=0; y<this._height; y++){
			for(var x=0; x<this._width; x++){
				var tileIndex=this._tileIndexes[index];
				var props=this.constructor.parseAttributeByte(this._attributes[index++]);

				var imageDataTile=tiles[tileIndex].toImageData(palettes[props.paletteIndex], props.flipX, props.flipY, transparent);
				ctx.putImageData(imageDataTile, x*8, y*8);
			}
		}

		return ctx.getImageData(0,0, this._width*8, this._height*8);
	}
}
export class MapSNES extends Map{
	constructor(w, h){
		super(w, h);
	}

	static parseAttributeByte(byteAttribute){
		return {
			paletteIndex:(byteAttribute >> 2) & 0b00000011,
			flipX: byteAttribute & 0b01000000,
			flipY: byteAttribute & 0b10000000
		}
	}
	
	static import(data, w, h){
		var map=new this(w, h);
		if(data.length/2 !== w*h){
			throw new Error('invalid map size');
		}
		for(var i=0; i<data.length; i+=2){
			map._tileIndexes[i/2] = data[i + 0];
			map._attributes[i/2] = data[i + 1];
		}
		return map;
	}
}
export class MapDMG extends Map{
	constructor(w, h){
		super(w, h);
	}

	static parseAttributeByte(byteAttribute){
		return {
			paletteIndex: 0,
			flipX: false,
			flipY: false
		}
	}
	
	static import(data, w, h){
		var map=new this(w, h);
		if(data.length !== w*h){
			throw new Error('invalid map size');
		}
		for(var i=0; i<data.length; i++){
			map._tileIndexes[i] = data[i];
			map._attributes[i] = 0x00;
		}
		return map;
	}
}