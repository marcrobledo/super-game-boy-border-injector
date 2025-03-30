/*
* JS implementation of Super Game Boy Border Injector
* https://github.com/marcrobledo/super-game-boy-border-injector
* (last update: 2025-03-30)
* By Marc Robledo https://www.marcrobledo.com
*
* License:
*
* MIT License
* 
* Copyright (c) 2024-2025 Marc Robledo
* 
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
* 
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
*/

import { FileParser } from './file-parser.js'
import { PaletteGB, PaletteSNES, ColorRGB15, Tile4BPP, MapSNES } from './console-graphics.js'
import { EXAMPLE_GB_TILE_DATA, EXAMPLE_GB_MAP_DATA, SGB_DEFAULT_PALETTE } from './preview-example-data.js'
import { getAssembledHookInfo, ASSEMBLED_SGB_CODE, SGB_INIT_CUSTOM_PALETTE_CODE_OFFSET, SGB_INIT_RET_OFFSET } from './assembled-code.js'
import { KNOWN_GAMES } from './known-games.js'
import { BORDER_GALLERY, findBordersByName, getBorderDescription } from './border-gallery.js'






const currentFileData={
	rom:null, //FileParser
	romType:null,
	border:{
		data:{
			map:null,
			tiles:null,
			palettes:null
		},
		tempData:{ //for separate bin files
			map:null,
			tiles:null,
			palettes:null,
			fromGallery:false
		}
	},
	palette:null
}


var binFilesQueue;




function buildBorderGallery(){
	if($('#border-gallery').children().length===0){
		BORDER_GALLERY.forEach(function(border){
			const img=new Image();
			img.loading='lazy';
			img.onload=function(evt){
				if(this.naturalHeight===232){
					//create a canvas to crop the first 8 top pixels
					const canvas=document.createElement('canvas');
					canvas.width=this.naturalWidth;
					canvas.height=this.naturalHeight - 8;
					const ctx=canvas.getContext('2d');
					ctx.drawImage(this, 0, -8);
					this.parentElement.replaceChild(canvas, this);
				}
				//console.log('loaded '+this.src+', height: '+this.height);
			}

			img.src='web-injector/assets/border-gallery/'+border.id+'.png';

			
			$('#border-gallery').append($('<button></button>').addClass('picker').append(img).append(getBorderDescription(border)).on('click', function(evt){

				fetchBorder(border, true);

				$('#dialog-borders').get(0).close();
				$('#picker-border').addClass('picker-ok');
			}));
		});
	}
}
function showBorderModal(){
	if($('#radio-border-file').prop('checked')){
		$('#choose-border-file').show();
		$('#choose-border-gallery').hide();
	}else{
		$('#choose-border-file').hide();
		$('#choose-border-gallery').show();
		buildBorderGallery();
	}

	
	currentFileData.border.tempData={
		map:null,
		tiles:null,
		palettes:null
	}
	refreshTempDataLog();

	$('#dialog-borders').get(0).showModal();
}
function refreshTempDataLog(){
	const logger=document.getElementById('temp-data-log');
	logger.innerHTML='';
	logger.appendChild(document.createElement('div'));
	logger.appendChild(document.createElement('div'));
	logger.appendChild(document.createElement('div'));


	if(currentFileData.border.tempData.map){
		logger.children[0].innerHTML='Map data';
		logger.children[0].className='temp-data-ok';
	}else{
		logger.children[0].innerHTML='Map data: missing';
		logger.children[0].className='temp-data-ko';
	}
	if(currentFileData.border.tempData.tiles){
		logger.children[1].innerHTML='Tile data';
		logger.children[1].className='temp-data-ok';
	}else{
		logger.children[1].innerHTML='Tile data: missing';
		logger.children[1].className='temp-data-ko';
	}
	if(currentFileData.border.tempData.palettes){
		logger.children[2].innerHTML='Palette data';
		logger.children[2].className='temp-data-ok';
	}else{
		logger.children[2].innerHTML='Palette data: missing';
		logger.children[2].className='temp-data-ko';
	}
}

const buildPaletteFromInputColors=function(){
	const palette=new PaletteGB(4);
	for(var i=0; i<4; i++){
		const components=RGB24toComponents(document.getElementById('input-color'+i).value);
		palette.colors[i]=new ColorRGB15(components.r, components.g, components.b);
	}
	return palette;
}


const Snackbar=(function(){
	const container=document.createElement('div');
	container.id='snackbars';
	const _closeSnackbar=function(snackbar){
		snackbar.removeEventListener('click',_evtClickSnackbar);
		window.clearTimeout(snackbar.autoCloseTimeout);
		snackbar.className=snackbar.className.replace(' open','');
		window.setTimeout(function(){container.removeChild(snackbar)},600);
	};
	const _evtClickSnackbar=function(evt){
		_closeSnackbar(this);
	};

	window.addEventListener('load',function(){
		document.body.appendChild(container);
	});

	return{
		show:function(message, className){
			const snackbar=document.createElement('div');
			snackbar.className='snackbar'+(typeof className==='string'? ' snackbar-'+className:'');
			snackbar.innerHTML=message;
			snackbar.addEventListener('click',_evtClickSnackbar);
			container.appendChild(snackbar);
			window.requestAnimationFrame(function(){
				window.requestAnimationFrame(function(){
					snackbar.className+=' open';
					snackbar.autoCloseTimeout=window.setTimeout(function(){
						_closeSnackbar(snackbar);
					}, 5000);
				});
			});
		}
	}
}());

$(document).ready((evt) => {	
	/* UI events */
	document.getElementById('picker-rom').addEventListener('click', function(evt){
		document.getElementById('input-file-rom').click();
	});
	document.getElementById('input-file-rom').addEventListener('change', function(evt) {
		if(!this.files || !this.files.length)
			return false;

		const fileName=this.files[0].name;
		const fileReader=new FileReader();
		fileReader.onload=function(evt){
			const file=new FileParser(this.result, fileName);
			const result=getGameBoyRomInfo(file);
			if(result.success){
				currentFileData.rom=file;
				document.getElementById('picker-title-rom').innerHTML=file.name;
				document.getElementById('picker-check-rom').title='ROM info: '+result.message;
				document.getElementById('picker-rom').className='picker picker-ok';
				refreshBuildButton();
				const matchedBordersFromGallery=findBordersByName(currentFileData.rom.name);
				if(matchedBordersFromGallery.length===1){
					fetchBorder(matchedBordersFromGallery[0]);
				}
			}else{
				Snackbar.show(result.message, 'danger');
			}
		};
		fileReader.readAsArrayBuffer(this.files[0]);
	});






	document.querySelector('.btn-dialog-close').addEventListener('click', function(evt){
		this.parentElement.parentElement.close();
	});

	$('#picker-border').on('click', (evt) => {
		showBorderModal();
	});
	document.getElementById('picker-palette').addEventListener('click', function(evt){
		if(currentFileData.palette){
			currentFileData.palette=null;
		}else{
			currentFileData.palette=buildPaletteFromInputColors();

		}
		refreshCanvasBorder();
		refreshPickerPalette();
	});
	document.getElementById('palette-color0').addEventListener('click', function(evt){
		evt.stopPropagation();
		document.getElementById('input-color0').click();
	});
	document.getElementById('palette-color1').addEventListener('click', function(evt){
		evt.stopPropagation();
		document.getElementById('input-color1').click();
	});
	document.getElementById('palette-color2').addEventListener('click', function(evt){
		evt.stopPropagation();
		document.getElementById('input-color2').click();
	});
	document.getElementById('palette-color3').addEventListener('click', function(evt){
		evt.stopPropagation();
		document.getElementById('input-color3').click();
	});

	$('#radio-border-file').on('change', (evt) => {
		$('#choose-border-file').show();
		$('#choose-border-gallery').hide();
	});
	$('#radio-border-gallery').on('change', (evt) => {
		$('#choose-border-file').hide();
		$('#choose-border-gallery').show();
		buildBorderGallery();
	});
	$('#picker-border-map').on('click', (evt) => {
		$('#input-file-border').trigger('click');
	});

	$('#input-file-border').on('change', function(evt) {
		if(this.files && this.files.length){
			const inputFiles=Array.from(this.files);
			const fileSGB=inputFiles.find((file) => /\.sgb$/i.test(file.name) && file.size===10112);
			if(fileSGB){
				const fileReaderSGB=new FileReader();
				fileReaderSGB.onload=function(evt){
					const file=new FileParser(this.result);
					parseFileBorderSGB(file, false);
				};	
				fileReaderSGB.readAsArrayBuffer(fileSGB);
			}else{
				const binFiles=inputFiles.filter((file) => /\.bin$/i.test(file.name) && file.size%32===0);

				if(binFiles.length!==0){
					binFilesQueue=[];

					binFiles.forEach((file) => {
						const fileReader=new FileReader();
						fileReader.onload=function(evt){
							const fileParser=new FileParser(this.result, file.name);
							binFilesQueue.push({type:guessFileBorder(fileParser), file:fileParser});
							if(binFilesQueue.length===binFiles.length){
								parseBinFilesQueue(false);
							}
						};
						fileReader.readAsArrayBuffer(file);
					});
				}else{
					Snackbar.show('Invalid file: must be a .sgb or .bin file with valid SGB border data', 'danger');
				}
			}
		}
	});
	
	$('#input-color0, #input-color1, #input-color2, #input-color3').on('click', function(evt){
		evt.stopPropagation();
		if(!currentFileData.palette){
			currentFileData.palette=buildPaletteFromInputColors();
			refreshCanvasBorder();
			refreshPickerPalette();
		}
	});
	$('#input-color0, #input-color1, #input-color2, #input-color3').on('change', function(){
		if(currentFileData.palette){
			var colorIndex=parseInt(this.id.replace('input-color',''));
			var components=RGB24toComponents(this.value);
			currentFileData.palette.colors[colorIndex]=new ColorRGB15(components.r, components.g, components.b);
			refreshCanvasBorder();
			refreshPickerPalette();
		}
	});

	$('#btn-custom-border').on('click', function(evt){
		document.getElementById('input-file-border').click();
	});
	$('#btn-build').on('click', buildROM);


	refreshPickerPalette();
});







function refreshBuildButton(){
	const validBorder=currentFileData.border.data.map && currentFileData.border.data.tiles && currentFileData.border.data.palettes;
	const validRom=currentFileData.rom;

	document.getElementById('btn-build').disabled=!(validRom && validBorder);
}
function refreshCanvasBorder(){
	const map=currentFileData.border.data.map?._snes;
	const tiles=currentFileData.border.data.tiles?._snes;
	const palettes=currentFileData.border.data.palettes?._snes;

	if(map && tiles && palettes){
		const dmgPalette=currentFileData.palette || SGB_DEFAULT_PALETTE;
		document.getElementById('canvas-preview').getContext('2d').putImageData(EXAMPLE_GB_MAP_DATA.toImageData(EXAMPLE_GB_TILE_DATA, [dmgPalette]), 48, 40);
		
		const tempCanvas=document.createElement('canvas');
		tempCanvas.width=256;
		tempCanvas.height=224;
		tempCanvas.getContext('2d').putImageData(map.toImageData(tiles, palettes, true), 0, 0);
		document.getElementById('canvas-preview').getContext('2d').drawImage(tempCanvas, 0, 0);

		document.getElementById('picker-border').className='picker picker-ok';
		document.getElementById('picker-title-border').innerHTML='';
		if(currentFileData.border.data.fromGallery)
			document.getElementById('picker-title-border').appendChild(getBorderDescription(currentFileData.border.data.fromGallery));
		else
			document.getElementById('picker-title-border').innerHTML='Custom';
		document.getElementById('picker-check-border').title='Border info: '+tiles.length+' tiles, '+palettes.length+' palettes';
		if(palettes.length===4)
			document.getElementById('picker-check-border').title+=' (might show up incorrectly in real hardware)';
	}
	refreshBuildButton();
}
function refreshPickerPalette(){
	const dmgPalette=currentFileData.palette || SGB_DEFAULT_PALETTE;

	document.getElementById('palette-color0').style.backgroundColor=componentsToRGB24(dmgPalette.colors[0]);
	document.getElementById('palette-color1').style.backgroundColor=componentsToRGB24(dmgPalette.colors[1]);
	document.getElementById('palette-color2').style.backgroundColor=componentsToRGB24(dmgPalette.colors[2]);
	document.getElementById('palette-color3').style.backgroundColor=componentsToRGB24(dmgPalette.colors[3]);
	document.getElementById('picker-title-palette').innerText=currentFileData.palette? 'Yes':'No';
	document.getElementById('picker-palette').className=currentFileData.palette? 'picker picker-ok':'picker';
}


























function componentsToRGB24(color){
	return '#'+
		('0'+color.r8.toString(16)).slice(-2)+
		('0'+color.g8.toString(16)).slice(-2)+
		('0'+color.b8.toString(16)).slice(-2);
}
function RGB24toComponents(rgb24){
	return{
		r:parseInt(rgb24.substr(1, 2), 16),
		g:parseInt(rgb24.substr(3, 2), 16),
		b:parseInt(rgb24.substr(5, 2), 16)
	}
}


const CARTRIDGE_TYPES=[
	{supported:true, id:0x00, mbc:0, title:'ROM (no MBC)'},
	{supported:true, id:0x08, mbc:0, title:'ROM + RAM (no MBC)'},
	{supported:true, id:0x09, mbc:0, title:'ROM + RAM + Battery (no MBC)'},
	{supported:true, id:0x01, mbc:1, title:'MBC1'},
	{supported:true, id:0x02, mbc:1, title:'MBC1 + RAM'},
	{supported:true, id:0x03, mbc:1, title:'MBC1 + RAM + Battery'},
	{supported:true, id:0x05, mbc:2, title:'MBC2 + RAM'},
	{supported:true, id:0x06, mbc:2, title:'MBC2 + RAM + Battery'},
	{supported:false, id:0x0b, mbc:0, title:'MMM01 (unsupported)'},
	{supported:false, id:0x0c, mbc:0, title:'MMM01 + RAM (unsupported)'},
	{supported:false, id:0x0d, mbc:0, title:'MMM01 + RAM + Battery (unsupported)'},
	{supported:true, id:0x11, mbc:3, title:'MBC3'},
	{supported:true, id:0x12, mbc:3, title:'MBC3 + RAM'},
	{supported:true, id:0x13, mbc:3, title:'MBC3 + RAM + Battery'},
	{supported:true, id:0x0f, mbc:3, title:'MBC3 + Battery + RTC'},
	{supported:true, id:0x10, mbc:3, title:'MBC3 + RAM + Battery + RTC'},
	{supported:true, id:0x19, mbc:5, title:'MBC5'},
	{supported:true, id:0x1a, mbc:5, title:'MBC5 + RAM'},
	{supported:true, id:0x1b, mbc:5, title:'MBC5 + RAM + Battery'},
	{supported:true, id:0x1c, mbc:5, title:'MBC5 + Rumble'},
	{supported:true, id:0x1d, mbc:5, title:'MBC5 + RAM + Rumble'},
	{supported:true, id:0x1e, mbc:5, title:'MBC5 + RAM + Battery + Rumble'},
	{supported:true, id:0x22, mbc:7, title:'MBC7 + RAM + Battery + Gyro'},
	{supported:true, id:0xfc, mbc:0, title:'GB Camera + RAM + Battery (unsupported)'},
	{supported:false, id:0xff, mbc:0, title:'HuC1 + RAM + Battery (unsupported)'},
	{supported:false, id:0xfe, mbc:0, title:'HuC3 + RAM + Battery (unsupported)'}
];
/*
const CARTRIDGE_SIZES=[
	{supported:false, id:0x00, banks:2, title:'32KB'},
	{supported:true, id:0x01, banks:4, title:'64KB'},
	{supported:true, id:0x02, banks:8, title:'128KB'},
	{supported:true, id:0x03, banks:16, title:'256KB'},
	{supported:true, id:0x04, banks:32, title:'512KB'},
	{supported:true, id:0x05, banks:64, title:'1MB'},
	{supported:true, id:0x06, banks:128, title:'2MB'},
	{supported:true, id:0x07, banks:256, title:'4MB'},
	{supported:false, id:0x08, banks:512, title:'8MB'},
	{supported:false, id:0x52, banks:72, title:'1152KB'},
	{supported:false, id:0x53, banks:80, title:'1280KB'},
	{supported:false, id:0x54, banks:96, title:'1536KB'}
];
*/


const getGameBoyRomInfo=function(file){
	const result={
		success:false,
		message:'Invalid or incompatible Game Boy ROM',
	}

	try{
		//check Nintendo header
		file.seek(0x0104);
		const headerXor=file.readBytes(48).reduce(function(acc, current){
			return acc ^ current;
		}, 0x00);
		if(headerXor!==0x86){
			throw new Error('Invalid Nintendo header');
		}

		//get cartridge type and size
		file.seek(0x0147);
		const byteType=file.readByte();
		const byteSize=file.readByte();
		
		var nBanks;
		if(byteSize<=8){
			nBanks=Math.pow(2, byteSize+1);
		}else if(byteSize%16384===0){
			nBanks=(byteSize+1)*2;
		}else{
			nBanks=0;
		}

		const cartridgeType=CARTRIDGE_TYPES.find((cartridgeType) => cartridgeType.id===byteType);
		if(!cartridgeType)
			throw new Error('Unsupported cartridge');

		result.success=cartridgeType.supported;
		currentFileData.romType=cartridgeType;
		currentFileData.romType.banks=nBanks;


		var fileSize=nBanks*16384;
		if((fileSize / 1048576) < 1)
			fileSize=(fileSize/1024)+'KB';
		else
			fileSize=(fileSize/1048576)+'MB';
		result.message=currentFileData.romType.title+' - '+fileSize+' ('+nBanks+' banks)';

	}catch(err){
		result.message=err.message;
		result.success=false;
	}

	return result;
}




function fetchBorder(border){
	fetch('./web-injector/assets/border-gallery/'+border.id+'.sgb').then((response) => {
		if(response.ok){
			response.arrayBuffer().then((arrayBuffer) => {
				const file=new FileParser(arrayBuffer, border.id+'.sgb');
				if(border.palette){
					document.getElementById('input-color0').value=border.palette[0];
					document.getElementById('input-color1').value=border.palette[1];
					document.getElementById('input-color2').value=border.palette[2];
					document.getElementById('input-color3').value=border.palette[3];
					currentFileData.palette=buildPaletteFromInputColors();
					refreshPickerPalette();
				}
				parseFileBorderSGB(file, border);
			});
		}
	});
}

function guessFileBorder(file){
	if(file.length()===1792){ //could be: tiles or map
		file.seek(0);
		while(!file.isEOF()){
			file.readByte(); //posible tile byte
			const possibleTileAttributes=file.readByte();

			if(possibleTileAttributes & 0b00000011){ //any bits but flips or palette index
				return 'tiles';
			}
		}
		//it's probably map, but could be tile data in VERY rare cases (56 tiles, none of them have bits 2-5 set)
		//try to guess by filename
		if(/[^A-Za-z]tiles/i.test(file.name))
			return 'tiles';
		//it's very unlikely it won't be a map file
		return 'map'; 

	}else if(file.length()===32 || file.length()===64 || file.length()===96 || file.length()===128){ //could be: tiles or palettes
		file.seek(0);
		while(!file.isEOF()){
			file.readByte(); //posible first color byte
			const possibleSecondColorByte=file.readByte();

			if(possibleSecondColorByte & 0b10000000){ //any bits but 15th bit
				return 'tiles';
			}
		}
		//it's probably palettes, but could be palette data in VERY rare cases (2, 4, 8 or 16 tiles, no colors with 15th bit set)
		//try to guess by filename
		if(/[^A-Za-z]tiles/i.test(file.name))
			return 'tiles';
		//it's very unlikely it won't be a palette file
		return 'palettes';
	}else{ //is tiles
		return 'tiles';
	}
}
function parseBinFilesQueue(fromGallery){
	const isCustom=!fromGallery;
	const fileMap=binFilesQueue.find((file) => file.type==='map')?.file;
	if(fileMap){
		try{
			/* check file validity */
			if(fileMap.length()!==1792)
				throw new Error('invalid size (must be 1792 bytes)');
			fileMap.seek(0);
			while(!fileMap.isEOF()){
				fileMap.readByte();
				const tileAttributes=fileMap.readByte();
	
				if(tileAttributes & 0b00000011)
					throw new Error('Invalid tile attributes (bits 0-1 must be 0)');
			}

			/* import map */
			currentFileData.border.tempData.map=fileMap;

			if(isCustom)
				refreshTempDataLog();
		}catch(err){
			Snackbar.show('Invalid border map file: '+err.message, 'danger');
		}
	}
	const fileTiles=binFilesQueue.find((file) => file.type==='tiles')?.file;
	if(fileTiles){
		try{
			/* check file validity */
			if(fileTiles.length()%32!==0)
				throw new Error('invalid size (must be divisible by 32)');
			else if((fileTiles.length()/32)>256)
				throw new Error('more than 256 tiles');

			/* import tiles */
			currentFileData.border.tempData.tiles=fileTiles;

			if(isCustom)
				refreshTempDataLog();
		}catch(err){
			Snackbar.show('Invalid border tiles file: '+err.message, 'danger');
		}
	}
	const filePalettes=binFilesQueue.find((file) => file.type==='palettes')?.file;
	if(filePalettes){
		try{
			/* check file validity */
			if(filePalettes.length()!==32 && filePalettes.length()!==64 && filePalettes.length()!==96 && filePalettes.length()!==128)
				throw new Error('invalid size (must be 32, 64, 96 or 128)');
			filePalettes.seek(0);
			while(!filePalettes.isEOF()){
				const rgb15=filePalettes.readWord();
				if(rgb15 & 0x8000)
					throw new Error('invalid color found');
			}

			/* import palettes */
			currentFileData.border.tempData.palettes=filePalettes;

			if(isCustom)
				refreshTempDataLog();
		}catch(err){
			Snackbar.show('Invalid border palettes file: '+err.message, 'danger');
		}
	}

	if(currentFileData.border.tempData.map && currentFileData.border.tempData.tiles && currentFileData.border.tempData.palettes){
		currentFileData.border.data.map=currentFileData.border.tempData.map;
		currentFileData.border.data.tiles=currentFileData.border.tempData.tiles;
		currentFileData.border.data.palettes=currentFileData.border.tempData.palettes;
		currentFileData.border.data.fromGallery=fromGallery;
	
		/* generate SNES objects for preview purposes */
		currentFileData.border.data.map._snes=MapSNES.import(currentFileData.border.tempData.map.toArray(), 32, 28);
		currentFileData.border.data.tiles._snes=new Array(currentFileData.border.tempData.tiles.length() / 32);
		currentFileData.border.data.tiles.seek(0);
		for(var i=0; i<currentFileData.border.data.tiles._snes.length; i++){
			currentFileData.border.data.tiles._snes[i]=Tile4BPP.import(currentFileData.border.data.tiles.readBytes(32));
		}
		currentFileData.border.data.palettes._snes=new Array(currentFileData.border.tempData.palettes.length() / 32);
		currentFileData.border.data.palettes.seek(0);
		var paletteIndex=0;
		while(!currentFileData.border.data.palettes.isEOF()){
			currentFileData.border.data.palettes._snes[paletteIndex++]=PaletteSNES.import(currentFileData.border.data.palettes.readWords(16));
		}

		document.getElementById('dialog-borders').close();
		refreshCanvasBorder();
	}
}
function parseFileBorderSGB(file, fromGallery){
	const mapFile=file.slice(0x2000, 32*28*2);

	const tempMap=MapSNES.import(mapFile.toArray(), 32, 28);
	const nTiles=tempMap.getMaxTileIndex();
	const nPalettes=tempMap.getMaxPaletteIndex();

	binFilesQueue=[
		{type:'map', file:mapFile},
		{type:'tiles', file:file.slice(0x0000, nTiles*32)},
		{type:'palettes', file:file.slice(0x2700, 16*2*nPalettes)}
	];
	parseBinFilesQueue(fromGallery);
}




function buildRepeatData(len, data){
	return Array(len).fill(data);
}
function findRepeatBytes(file, offset, len, repeatMany){
	file.seek(offset);
	var b=file.readByte();
	return findBytes(file, {offset:file.getOffset(), len:repeatMany || 1, data:buildRepeatData(len -1, b), reverse: false});
}

function findBytes(file, obj){
	var startOffset=obj.offset;
	var len=obj.len;
	var bytes=obj.data;
	var reverse=obj.reverse;

	for(var i=0; i<len; i++){
		var searchOffset;
		if(!reverse)
			searchOffset=startOffset+i;
		else
			searchOffset=startOffset-bytes.length-i;

		file.seek(searchOffset);
		var found=true;
		for(var j=0; j<bytes.length && found; j++){
			if(file.readByte()!==bytes[j]){
				found=false
			}
		}
		if(found)
			return searchOffset;
	}
	return null;
}

function findFreeSpace(rom, assembledHookInfo){
	var freeSpace0=findBytes(rom, {offset:0x4000, len:0x80, data:buildRepeatData(assembledHookInfo.code.length, 0xff), reverse: true});
	if(freeSpace0===null)
		freeSpace0=findBytes(rom, {offset:0x0000, len:0xf3, data:buildRepeatData(assembledHookInfo.code.length, 0xff), reverse: false});
	if(freeSpace0===null)
		freeSpace0=findBytes(rom, {offset:0x0000, len:0xf3, data:buildRepeatData(assembledHookInfo.code.length, 0x00), reverse: false});
	return freeSpace0;
}


function buildROM(){
	var rom=currentFileData.rom.slice();

	try{
		//add MBC to ROM if needed
		if(!currentFileData.romType.mbc){
			rom.seek(0x0147)
			if(currentFileData.romType.id===0x00){ //ROM
				rom.writeByte(0x01);
			}else if(currentFileData.romType.id===0x08){ //ROM + RAM
				rom.writeByte(0x02);
			}else if(currentFileData.romType.id===0x09){ //ROM + RAM + Battery
				rom.writeByte(0x03);
			}
		}

		var relativeJump=false;
		var jpOffset=false;

		//search for first jr/jp in entry point ($0100)
		//most commercial games use the recommended nop+jp
		//looks like GB Studio games skip the nop for some reason, so let's look for a jp first at jp
		rom.seek(0x0100);
		var firstByte=rom.readByte();

		if(firstByte===0xc3){ //jp in $0100
			jpOffset=rom.getOffset() - 1;
			relativeJump=false;
		}else if(firstByte===0x18){ //jr in $0100
			jpOffset=rom.getOffset() - 1;
			relativeJump=true;
		}
		
		if(!jpOffset){
			firstByte=rom.readByte();
			if(firstByte===0xc3){ //jp in $0101
				jpOffset=rom.getOffset() - 1;
				relativeJump=false;
			}else if(firstByte===0x18){ //jr in $0101
				jpOffset=rom.getOffset() - 1;
				relativeJump=true;
			}
		}

		if(!jpOffset)
			throw new Error('Game has no jp entry point');

		if(relativeJump)
			console.log('found jr entry point to $0'+jpOffset.toString(16));
		else
			console.log('found jp entry point to $0'+jpOffset.toString(16));


		//check if it's a known game
		var knownGame=null;
		rom.seek(0x014e);
		var globalChecksum=rom.readWord();
		for(var i=0; i<KNOWN_GAMES.length && !knownGame; i++){
			if(KNOWN_GAMES[i].globalChecksum===globalChecksum){
				knownGame=KNOWN_GAMES[i];
				console.log('known game found: '+knownGame.title);
			}
		}
		
		//GB Camera ROM cannot be expanded, delete data at bank 0x3d
		//see https://github.com/marcrobledo/super-game-boy-border-injector/issues/5#issuecomment-1978411613
		if(knownGame && /Game Boy Camera/.test(knownGame.title)){
			rom.seek(0x3d * 0x4000);
			for(var i=0; i<0x4000; i++){
				rom.writeByte(0x00);
			}
			console.log('gb camera found, emptying bank 0x3d');
		}

		//search a free bank, expand rom if needed
		var freeBankX=null;
		for(var i=0x4000; i<rom.length() && !freeBankX; i+=0x4000){
			if(findRepeatBytes(rom, i, 0x4000)){
				freeBankX=i / 0x4000;
			}
		}

		if(freeBankX){
			console.log('free bank found $'+freeBankX.toString(16));
		}else{
			console.log('no free bank found, expanding ROM');
			freeBankX=rom.length() / 0x4000;
			
			var newRom=new FileParser(new Uint8Array(rom.length() * 2));
			rom.seek(0);
			for(var i=0; i<rom.length(); i++){
				newRom.writeByte(rom.readByte());
			}
			for(; i<newRom.length(); i++){
				newRom.writeByte(0xff);
			}


			rom=newRom;
			//fix ROM size in header
			var nBanks=rom.length() / 0x4000;
			rom.seek(0x0148);
			rom.writeByte(Math.log2(nBanks) - 1);
		}


		var assembledHookInfo;
		if(currentFileData.romType.mbc===1 && freeBankX>=0x20){
			console.log('using assembled code for MBC1+ROM bigger than 1MB');
			if(freeBankX===0x20 || freeBankX===0x40 || freeBankX===0x60){
				//banks $20, $40, $60 need additional code to be accesed
				//use $21, $41 or $61 instead
				freeBankX++;
			}

			assembledHookInfo=getAssembledHookInfo('mbc1_extra');
		}else if(currentFileData.romType.mbc===2){
			assembledHookInfo=getAssembledHookInfo('mbc2');
		}else{
			assembledHookInfo=getAssembledHookInfo('default');
		}

		//find free space in bank 0
		var freeSpace0=findFreeSpace(rom, assembledHookInfo);
		
		if(freeSpace0===null){
			if(knownGame && knownGame.safeOffset){
				//if it's a known game, use a known safe offset for free space
				freeSpace0=knownGame.safeOffset;
			}

			if(freeSpace0===null && assembledHookInfo.id==='default'){
				//game has no free 16 bytes, try to inject the 14 bytes optimized version
				console.log('trying to fit optimized_hl hook code');
				assembledHookInfo=getAssembledHookInfo('optimized_hl');
				//try again
				freeSpace0=findFreeSpace(rom, assembledHookInfo);
			}
			
			if(freeSpace0===null){
				//if it still hasn't found free space, check if we can nop some rst
				var nFound=0;
				for(var i=0; i<0x40; i+=0x08){
					var foundFreeRst=findBytes(rom, {offset:i, len:1, data:[0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], reverse: false});
					if(foundFreeRst!==null){
						console.log('nopped potential free rst: 0x'+i.toString(16));
						rom.seek(i);
						rom.writeByte(0x00);
						nFound++;
						if(nFound===2){
							//we nopped two rsts, there is enough space already
							break;
						}
					}
				}

				//try again
				freeSpace0=findFreeSpace(rom, assembledHookInfo);
			}

			if(freeSpace0===null){
				throw new Error('Bank 0 has no free space (need '+assembledHookInfo.code.length+' bytes)');
			}
		}

		console.log(assembledHookInfo.code.length+' free bytes found in bank 0: $'+freeSpace0.toString(16));

		console.log('using hook code: '+assembledHookInfo.id);
		
		
		//add SGB flags to header
		rom.seek(0x0146);
		rom.writeByte(0x03);
		rom.seek(0x014b);
		rom.writeByte(0x33);

		//replace entry point
		rom.seek(jpOffset + 1);
		var originalEntryPoint;
		if(relativeJump){
			var relativeOffset=rom.readByte();
			if(relativeOffset & 0x80){ //negative
				originalEntryPoint=jpOffset + 2 - ((relativeOffset ^ 0xff) + 1);
			}else{
				originalEntryPoint=jpOffset + 2 + relativeOffset;
			}
			console.log('replaced jr by jp $0'+originalEntryPoint.toString(16));
			rom.seek(jpOffset);
			rom.writeByte(0xc3); //replace jr with jp
		}else{
			originalEntryPoint=rom.readWord();
		}
		rom.seek(jpOffset + 1);
		rom.writeWord(freeSpace0);

		//fix CGB only flag (set it to dual DMG+CGB compatibility for emulators)
		rom.seek(0x0143);
		var cgbFlag=rom.readByte();
		if(cgbFlag===0xc0){
			rom.seek(0x0143);
			rom.writeByte(0x80);
			console.log('set CGB flag to dual DMG+CGB compatibility');
		}

		//patch entry point hook
		rom.seek(freeSpace0);
		assembledHookInfo.code[assembledHookInfo.patchOffsets.romBankNumber]=freeBankX;
		assembledHookInfo.code[assembledHookInfo.patchOffsets.entryPoint]=originalEntryPoint & 0xff;
		assembledHookInfo.code[assembledHookInfo.patchOffsets.entryPoint + 1]=(originalEntryPoint >> 8) & 0xff;
		if(assembledHookInfo.id==='mbc1_extra'){ //MBC1+1MB
			assembledHookInfo.code[assembledHookInfo.patchOffsets.romBankNumberUpperbits]=(freeBankX & 0b01100000) >> 5;
		}
		rom.writeBytes(assembledHookInfo.code);


		//apply custom patches
		if(knownGame && knownGame.nops){
			console.log('applying custom patches (original SGB border and/or anticopy protection removal');
			for(var i=0; i<knownGame.nops.length; i++){
				rom.seek(knownGame.nops[i]);
				rom.writeBytes([0x00, 0x00, 0x00]); //three nops
			}
		}


		//write SGB code
		rom.seek(freeBankX * 0x4000);
		rom.writeBytes(ASSEMBLED_SGB_CODE);

		//patch sgb_init ret (if needed)
		if(assembledHookInfo.patchSgbInit){
			console.log('patching sgb_init ret');
			rom.seek(freeBankX * 0x4000 + SGB_INIT_RET_OFFSET);
			rom.writeBytes(assembledHookInfo.patchSgbInit);
		}
		
		//disable custom GB palette by nopping call sgb_packet_transfer
		if(!currentFileData.palette){
			rom.seek(freeBankX * 0x4000 + SGB_INIT_CUSTOM_PALETTE_CODE_OFFSET);
			rom.writeBytes([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]); //nops
		}

		//write data: border map+palettes
		rom.seek(freeBankX * 0x4000 + (0x5300 - 0x4000));
		rom.writeBytes(currentFileData.border.data.map.toArray());
		const row28=currentFileData.border.data.map.slice(27*32 * 2, 32*2).toArray();
		for(var i=0; i<64; i+=2){
			row28[i + 1]=row28[i + 1] ^ 0b00000010; //row 28:clone latest row and flip it vertically to avoid scanline flickering
		}
		rom.writeBytes(row28);
		for(var i=0; i<32*2*3; i++){
			rom.writeByte(0x00); //rows 29-31
		}
		rom.writeBytes(currentFileData.border.data.palettes.toArray());

		//write data: border tileset
		rom.seek(freeBankX * 0x4000 + (0x5c00 - 0x4000));
		rom.writeBytes(currentFileData.border.data.tiles.toArray());

		//write data: game screen palettes
		rom.seek(freeBankX * 0x4000 + (0x7c00 - 0x4000));
		rom.writeWords((currentFileData.palette || SGB_DEFAULT_PALETTE).export());

		// calculate and fix checksums
		var newChecksum=0x00;
		rom.seek(0x0134);
		for(var i=0; i<=0x18; i++){
			newChecksum=((newChecksum - rom.readByte() - 1) >>> 0) & 0xff;
		}
		rom.seek(0x014d);
		rom.writeByte(newChecksum);

		rom.seek(0x0000);
		newChecksum=0x0000;
		for(var i=0; i<0x014e; i++){
			newChecksum=(newChecksum + rom.readByte()) & 0xffff;
		}
		rom.readWord();
		while(!rom.isEOF()){
			newChecksum=(newChecksum + rom.readByte()) & 0xffff;
		}
		rom.seek(0x014e);
		rom.writeByte((newChecksum >> 8) & 0xff);
		rom.writeByte(newChecksum & 0xff);


		var newRomName=currentFileData.rom.name.replace(/\.(gbc?)$/, ' (SGB Enhanced).$1');
		var blob=new Blob([rom.getBuffer()], {type: 'application/octet-stream'});
		saveAs(blob, newRomName);



	}catch(err){
		Snackbar.show('Incompatible ROM: '+err.message, 'danger');
	}
}