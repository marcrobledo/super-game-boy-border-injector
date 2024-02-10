/*
	the following games have no free space, but are known to have
	junk data that can be safely overwritten
*/

export const GAMES_WITH_JUNK=[
	{
		title:'Wario Land (World)',
		globalChecksum:0xa5f4,
		safeOffset:0x3fe0
	}
];