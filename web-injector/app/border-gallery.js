export const BORDER_GALLERY=[
    {
        id:'toruzz_super_mario_land',
        matches:['super mario land', 'sml'],
        name:'Super Mario Land',
        author:'toruzz',
        url:'https://toruzz.com'
    },
    {
        id:'toruzz_super_mario_land_2',
        matches:['super mario land 2', 'sml2'],
        name:'Super Mario Land 2',
        author:'toruzz',
        url:'https://toruzz.com'
    },
    {
        id:'kensuyjin33_kid_dracula',
        matches:['kid dracula', 'dracula kun'],
        name:'Kid Dracula',
        author:'Kensu William',
        url:'https://x.com/kensuyjin_33',
        palette:[
            '#fceaf6',
            '#34b7a1',
            '#5d2bb2',
            '#000000'
        ]
    },
    
    
    
    {
        id:'plunskas_catrap',
        matches:['catrap', 'pitman'],
        name:'Catrap / Pitman',
        author:'Plunskas',
        url:'https://bsky.app/profile/plunskas.bsky.social'
    },
    
    
    
    {
        id:'ryallasha_nvetay_metroid_2',
        matches:['metroid 2', 'samus'],
        name:'Metroid II: Return of Samus',
        author:'Ryallasha N\'vetay',
        url:'https://bsky.app/profile/ryallashanvetay.bsky.social'
    },

    {
        id:'marc_max_smurfs',
        matches:['smurfs', 'pitufos'],
        name:'The Smurfs',
        author:'Marc',
        url:'https://www.marcrobledo.com'
    },

    /* extracted from official SGB games */
    {id:'extracted_tetris_attack_baby_yoshi', name:'Baby Yoshi (Tetris Attack)', author:'Nintendo'},
    {id:'extracted_namco_gallery_dig_dug', name:'Dig Dug (Namco Gallery)', author:'Namco'},
    {id:'extracted_namco_gallery_mappy', name:'Mappy (Namco Gallery)', author:'Namco'},

    {group:'extracted_sgb_landscape', id:'extracted_sgb_landscape0', name:'SGB Landscape (morning)', author:'Nintendo'},
    {group:'extracted_sgb_landscape', id:'extracted_sgb_landscape1', name:'SGB Landscape (sunset)', author:'Nintendo'},
    {group:'extracted_sgb_landscape', id:'extracted_sgb_landscape2', name:'SGB Landscape (night)', author:'Nintendo'},
    {group:'extracted_sgb_landscape', id:'extracted_sgb_landscape3', name:'SGB Landscape (dawn)', author:'Nintendo'},

    {group:'extracted_picross_2_pocket', id:'extracted_picross_2_pocket0', name:'GB Pocket (grey)', author:'Nintendo', palette:['#c4cfa1','#8b956d','#4d533c','#1f1f1f']},
    {group:'extracted_picross_2_pocket', id:'extracted_picross_2_pocket1', name:'GB Pocket (green)', author:'Nintendo', palette:['#c4cfa1','#8b956d','#4d533c','#1f1f1f']},
    {group:'extracted_picross_2_pocket', id:'extracted_picross_2_pocket2', name:'GB Pocket (red)', author:'Nintendo', palette:['#c4cfa1','#8b956d','#4d533c','#1f1f1f']},
    {group:'extracted_picross_2_pocket', id:'extracted_picross_2_pocket3', name:'GB Pocket (yellow)', author:'Nintendo', palette:['#c4cfa1','#8b956d','#4d533c','#1f1f1f']},
    {group:'extracted_picross_2_pocket', id:'extracted_picross_2_pocket4', name:'GB Pocket (black)', author:'Nintendo', palette:['#c4cfa1','#8b956d','#4d533c','#1f1f1f']}
];


export const findBordersByName=function(romTitle){
	const slug=romTitle.toLowerCase().replace(/\.gbc?$/, '').replace(/ \(.*?\)$/g, '')
		//accents
		.replace(/[\xc0\xc1\xc2\xc4\xe0\xe1\xe2\xe4]/g, 'a')
		.replace(/[\xc8\xc9\xca\xcb\xe8\xe9\xea\xeb]/g, 'e')
		.replace(/[\xcc\xcd\xce\xcf\xec\xed\xee\xef]/g, 'i')
		.replace(/[\xd2\xd3\xd4\xd6\xf2\xf3\xf4\xf6]/g, 'o')
		.replace(/[\xd9\xda\xdb\xdc\xf9\xfa\xfb\xfc]/g, 'u')

		.replace(/[\xd1\xf1]/g, 'n')
		.replace(/[\xc7\xe7]/g, 'c')

		.replace(/[\xc6\xe6]/g, 'ae')
		.replace(/\x26/g,'and')
		.replace(/\u20ac/g,'euro')

		//remove all non-alphanumeric characters and trim
		.replace(/[^\w\- ]/g,'')
		.replace(/( |_)/g,' ')
		.replace(/-+/g,' ')
		.trim();


	return BORDER_GALLERY.filter(function(border){
		return border.matches && border.matches.find((tag) => slug.includes(tag));
	});
};

export const getBorderDescription=function(border){
	const borderName=document.createElement('div');
	borderName.className='border-name';
	borderName.innerHTML=border.name;
	const borderAuthor=document.createElement('div');
	borderAuthor.className='border-author';
	if(border.author){
		borderAuthor.innerHTML='by ';
		if(border.url){
			const a=document.createElement('a');
			a.href=border.url;
			a.target='_blank';
			a.addEventListener('click', function(evt){evt.stopPropagation();});
			a.innerHTML=border.author;
			borderAuthor.appendChild(a);
		}else{
			borderAuthor.innerHTML+=border.author;
		}
	}
	const wrapper=document.createElement('div');
	wrapper.appendChild(borderName);
	wrapper.appendChild(borderAuthor);
	return wrapper;
}