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
	}
];