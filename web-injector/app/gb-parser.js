export class FileParser{
	#u8array;
	#offset;
	name;

	constructor(arrayBuffer, name){
		this.#u8array=new Uint8Array(arrayBuffer);
		this.name=name;
		this.seek(0);
	}

	isEOF(){
		return !(this.#offset<this.length());
	}

	length(){
		return this.#u8array.length;
	}
	slice(offset, len){
		return new this.constructor(this.#u8array.slice(offset, offset+len).buffer);
	}
	toArray(){
		return Array.from(this.#u8array);
	}
	getBuffer(){
		return this.#u8array.buffer;
	}
	getOffset(){
		return this.#offset;
	}
	
	seek(offset){
		this.#offset=offset;
	}

	readByte(){
		return this.#u8array[this.#offset++];
	}
	readBytes(len){
		var bytes=new Array(len);
		for(var i=0; i<len; i++){
			bytes[i]=this.readByte();
		}
		return bytes;
	}
	readWord(){
		return this.readByte() + (this.readByte() << 8);
	}
	readWords(len){
		var words=new Array(len);
		for(var i=0; i<len; i++){
			words[i]=this.readWord();
		}
		return words;
	}
	
	writeBytes(data){
		for(var i=0; i<data.length; i++){
			this.#u8array[this.#offset++]=data[i];
		}
	}
	writeByte(data){
		this.writeBytes([data]);
	}

	writeWords(data){
		for(var i=0; i<data.length; i++){
			this.#u8array[this.#offset++]=data[i] & 0xff;
			this.#u8array[this.#offset++]=(data[i] >> 8) & 0xff;
		}
	}
	writeWord(data){
		this.writeWords([data]);
	}
}
