const bankOffset=function(bank, offset){return (bank * 0x4000) + (offset - 0x4000);}

export const KNOWN_GAMES=[
	/*
		SAFE OFFSETS
		safeOffset property defines a safe offset to write the hook code in those
		games that have no apparent free space and the injector cannot guess
		usually, these games have junk data at the end that can be safely
		overwritten
	*/
	{
		title:'Wario Land (World)',
		globalChecksum:0xa5f4,
		safeOffset:0x3fe0
	},
	{
		title:'Super Mario Land 2 - 6 Golden Coins (USA, Europe)',
		globalChecksum:0xf9e0,
		safeOffset:0x39d9
	},
	{
		title:'Super Mario Land 2 DX v1.8.1',
		globalChecksum:0xd9cf,
		safeOffset:0x39d9
	},



	/*
		ANTI COPY PROTECTION REMOVAL
		some games have anti copy protection removal that need to be removed
		to make the games work after its header has been changed
	*/
	{
		title:'Mega Man IV (USA)',
		globalChecksum:0xd18c,
		nops:(function(){
			const checks=[];
			for(var i=0; i<28; i++){
				checks.push(0x3f53 + i*6);
			}
			return checks;
		}())
	},
	{
		title:'Rockman World 4 (Japan)',
		globalChecksum:0x7b71,
		nops:(function(){
			const checks=[];
			for(var i=0; i<28; i++){
				checks.push(0x3f53 + i*6);
			}
			return checks;
		}())
	},
	
	
	
	/*
		SGB ENHANCED GAMES
		nops property will patch three nops to the desired offsets, useful to disable
		original SGB border loading and keep the injected one on-screen
	*/
	{
		title:'Pokemon - Red Version (USA, Europe)',
		globalChecksum:0xe691,
		nops:[bankOffset(0x1c, 0x604f), bankOffset(0x1c, 0x605c)]
	},{
		title:'Pokemon - Blue Version (USA, Europe)',
		globalChecksum:0x0a9d,
		nops:[bankOffset(0x1c, 0x604f), bankOffset(0x1c, 0x605c)]
	},{
		title:'Pokemon - Yellow Version (USA, Europe)',
		globalChecksum:0x7c04,
		nops:[bankOffset(0x1c, 0x6221), bankOffset(0x1c, 0x622e)]
	},{
		title:'Pokemon - Edicion Roja (Spain)',
		globalChecksum:0x4a38,
		nops:[bankOffset(0x1c, 0x603f), bankOffset(0x1c, 0x604c)]
	},{
		title:'Pokemon - Edicion Azul (Spain)',
		globalChecksum:0xd714,
		nops:[bankOffset(0x1c, 0x603f), bankOffset(0x1c, 0x604c)]
	},{
		title:'Pokemon - Edicion Amarilla - Edicion Especial Pikachu (Spain)',
		globalChecksum:0x3756,
		nops:[bankOffset(0x1c, 0x6211), bankOffset(0x1c, 0x621e)]
	},{
		title:'Mega Man V (USA)',
		globalChecksum:0x8e10,
		nops:[bankOffset(0x0f, 0x6197)]
	},{
		title:'Mega Man V (Europe)',
		globalChecksum:0x175a,
		nops:[bankOffset(0x0f, 0x6197)]
	},{
		title:'Rockman World 5 (Japan)',
		globalChecksum:0x29b0,
		nops:[bankOffset(0x0f, 0x6199)]
	},{
		title:'Game Boy Camera (USA, Europe) (SGB Enhanced)',
		globalChecksum:0xf9ba,
		nops:[0x1f4b /* CHR_TRN(0) */, 0x1f59 /* CHR_TRN(1) */, 0x1f67 /* PCT_TRN */]
	},{
		title:'Game Boy Camera Gold (USA) (SGB Enhanced)',
		globalChecksum:0x901e,
		nops:[0x1f4b /* CHR_TRN(0) */, 0x1f59 /* CHR_TRN(1) */, 0x1f67 /* PCT_TRN */]
	},{
		title:'Pocket Camera (Japan) (Rev 1) (SGB Enhanced)',
		globalChecksum:0x6293,
		nops:[0x1e49 /* CHR_TRN(0) */, 0x1e57 /* CHR_TRN(1) */, 0x1e65 /* PCT_TRN */]
	}
];