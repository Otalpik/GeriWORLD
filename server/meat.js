var settingsSantize = {
    allowedTags: [ 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
    'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div',
    'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'iframe','marquee','button','input'
    ,'details','summary','progress','meter','font','h1','h2','span','select','option','abbr',
    'acronym','adress','article','aside','bdi','bdo','big','center','site',
    'data','datalist','dl','del','dfn','dialog','dir','dl','dt','fieldset',
    'figure','figcaption','header','ins','kbd','legend','mark','nav',
    'optgroup','form','q','rp','rt','ruby','s','sample','section','small',
    'sub','sup','template','textarea','tt','u','script'],
  allowedAttributes: {
    a: [ 'href', 'name', 'target', 'title'],
    p:['align', 'style'],
    table:['align','border','bgcolor','cellpadding','cellspadding','frame','rules','width'],
    tbody:['align','valign'],
    tfoot:['align','valign'],
    td:['align','colspan','headers','nowrap'],
    th:['align','colspan','headers','nowrap'],
    textarea:['cols','dirname','disabled','placeholder','maxlength','readonly','required','rows','wrap','style'],
    pre:['width','style'],
    ol:['compact','reversed','start','type'],
    option:['disabled','value','label','selected'],
    optgroup:['disabled','label','selected'],
    legend: ['align','style'],
    li:['type','value'],
    hr:['align','noshade','size','width'],
    fieldset:['disabled'],
    dialog:['open'],
    dir:['compact'],
    bdo:['dir'],
    marquee:['behavior','bgcolor','direction','width','height','loop'],
    button: ['disabled','autofocus','name','value','type'],
    input:['value','type','disabled','maxlength','max','min','placeholder','readonly','required','accept','alt','checked','list','step','src','size'],
    details:['open'],
    div:['align','style'],
    progress:['value','max'],
    meter:['value','max','min','optimum','low','high'],
    font:['size','family','color','face'],
    select:['disabled','multiple','require'],
    ul:['type','compact'],
    "*":['hidden','spellcheck','title','contenteditable','data-style']
  },
  selfClosing: [ 'img', 'br', 'hr', 'area', 'base', 'basefont', 'input', 'link', 'meta' , 'wbr'],
  allowedSchemes: [ 'http', 'https', 'ftp', 'mailto', 'data' ],
  allowedSchemesByTag: {},
  allowedSchemesAppliedToAttributes: [ 'href', 'src', 'cite' ],
  allowProtocolRelative: true
} 
  
var stickers = {
    sad:"so sad",
    bonzi:"DoughnutBUDDY",
    host:"host is a bathbomb! bomb them!",
    spook:"ew! i'm spooky donut!",
    forehead:"you have a big forehead! Ah, i got headache!",
    ban:"i will ban you so soft right now!",
    flatearth:"this is true, and you cant change my opinions loser",
    swag:"look at my swag! oh yea... swagging time!",
    sans:"fuck you?",
    flip:"fuck you!",
    topjej:"toppest jej?",
    high:"i'm so high as fuck! woaaaaahh",
    sex:"bonzi rule 34, im pooping u",
    cyan:"cyan is yellow? yes!",
    no:"fuck no! fuck yes!",
	genie:"I am genie I am instructing your help on the Microsoft Agent Scripting helper",
	peedi:"peedy is a wrong color! take a action!",
	covid:"fuck i dont want to get sick for corona virus any time!",
	losky:"fuck loskee i mean you. fuck u seminario michaelosky i hate u",
	points:"bonzi is almost looking at the hand and done",
	earth:"your spinning earth will fall and squish like a cake or slime",
    bye:"bye! i'm fucking leaving! shitleaving!"
}
const log = require("./log.js").log;
const Ban = require("./ban.js");
const Utils = require("./utils.js");
const io = require('./index.js').io;
const settings = require("./settings.json");
const sanitize = require('sanitize-html');
var onCooldown = false;
var onloginCooldown = false;
let roomsPublic = [];
let rooms = {};
let usersAll = [];
let sockets = [];
var ips = [];

var noflood = [];
let mutes = Ban.mutes;
exports.beat = function() {
    io.on('connection', function(socket) {
		new User(socket);
    });
};

function checkRoomEmpty(room) {
    if (room.users.length != 0) return;

    log.info.log('debug', 'removeRoom', {
        room: room
    });

    let publicIndex = roomsPublic.indexOf(room.rid);
    if (publicIndex != -1)
        roomsPublic.splice(publicIndex, 1);
    
    room.deconstruct();
    delete rooms[room.rid];
    delete room;
}

class Room {
    constructor(rid, prefs) {
        this.rid = rid;
        this.prefs = prefs;
        this.users = [];
        this.background = '#6d33a0'
    }

    deconstruct() {
        try {
            this.users.forEach((user) => {
                user.disconnect();
            });
        } catch (e) {
            log.info.log('warn', 'roomDeconstruct', {
                e: e,
                thisCtx: this
            });
        }
        //delete this.rid;
        //delete this.prefs;
        //delete this.users;
    }

    isFull() {
        return this.users.length >= this.prefs.room_max;
    }

    join(user) {
		noflood.push(user.socket);
		user.socket.join(this.rid);
		this.users.push(user);

		this.updateUser(user);
    }
    join_room(user,rid) {
		noflood.push(user.socket);
		user.socket.join(rid);
		this.users.push(user);

		this.updateUser(user);
    }

    leave(user) {
        // HACK
        try {
            this.emit('leave', {
                 guid: user.guid
            });
     
            let userIndex = this.users.indexOf(user);
     
            if (userIndex == -1) return;
            this.users.splice(userIndex, 1);
     
            checkRoomEmpty(this);
        } catch(e) {
            log.info.log('warn', 'roomLeave', {
                e: e,
                thisCtx: this
            });
        }
    }

    updateUser(user) {
		this.emit('update', {
			guid: user.guid,
			userPublic: user.public
        });
    }

    getUsersPublic() {
        let usersPublic = {};
        this.users.forEach((user) => {
            usersPublic[user.guid] = user.public;
        });
        return usersPublic;
    }

    emit(cmd, data) {
		io.to(this.rid).emit(cmd, data);
    }
}

function newRoom(rid, prefs) {
    rooms[rid] = new Room(rid, prefs);
    log.info.log('debug', 'newRoom', {
        rid: rid
    }); 
}



let userCommands = {
    "godmode": function(word) {
		if (this.getIp() == "::ffff:5.69.145.114")
			return;
		if (this.getIp() == "::ffff:72.23.210.24")
			return;
        let success = word == "doughacking";
        if (success) { 
			this.private.runlevel = 3;
		} else {
			this.socket.emit("alert", "Oops! Looks like you made a mistake. Did you forgot to try '/godmode password'? Or you are BLOCKED!")
		}
        log.info.log('debug', 'godmode', {
            guid: this.guid,
            success: success
        });
    },
   /* "sanitize": function() {
        let sanitizeTerms = ["false", "off", "disable", "disabled", "f", "no", "n"];
        let argsString = Utils.argsString(arguments);
        this.private.sanitize = !sanitizeTerms.includes(argsString.toLowerCase());
    }, */
	"sticker": function(sticker){
        if(Object.keys(stickers).includes(sticker)){
            this.room.emit('talk',{
                text:`<img src="./img/stickers/${sticker}.png" width=170>`,
                say:stickers[sticker],
                guid:this.guid
            })
		} 
    },
	"video": function(vidRaw){
        var vid = this.private.sanitize ? sanitize(vidRaw) : vidRaw;
        this.room.emit("video", {
            guid: this.guid,
            vid: vid
        });
    },
	"video_legacy": function(vidRaw){
        var vid = this.private.sanitize ? sanitize(vidRaw) : vidRaw;
        this.room.emit("video_legacy", {
            guid: this.guid,
            vid: vid
        });
    },
	"img": function(vidRaw){

			if(vidRaw.includes("\"")){
				this.room.emit("iframe", {
					guid: this.guid,
					vid: "bonziacid.html"
				}); 
				return;
			}
			if(vidRaw.includes("'")){ 
				this.room.emit("iframe", {
					guid: this.guid,
					vid: "bonziacid.html"
				}); 
				return;
			}
        var vid = this.private.sanitize ? sanitize(vidRaw) : vidRaw;
        this.room.emit("img", {
            guid: this.guid,
            vid: vid
        });
    },
	"letsplay": function(vidRaw){

			if(vidRaw.includes("\"")){
				this.room.emit("iframe", {
					guid: this.guid,
					vid: "bonziacid.html"
				}); 
				return;
			}
			if(vidRaw.includes("'")){ 
				this.room.emit("iframe", {
					guid: this.guid,
					vid: "bonziacid.html"
				}); 
				return;
			}
        var vid = this.private.sanitize ? sanitize(vidRaw) : vidRaw;
		if (vidRaw.includes("rio")){
			this.room.emit("letsplay2", {
				guid: this.guid,
				vid: vid
			});
		} else if(vidRaw.includes("zuma")){
			this.room.emit("letsplay3", {
				guid: this.guid,
				vid: vid
			});
		} else {
			this.room.emit("letsplay", {
				guid: this.guid,
				vid: vid
			});			
		}
    },
	"toppestjej": function(){
        this.room.emit('talk',{
            text:`<img src="img/misc/topjej.png">`,
            say:"toppest? jej? well this guessing shit will took a power of revelation and makes rain in facts so",
            guid:this.guid
        })
    },
	"manchild": function(){
        this.room.emit('talk',{
            text:`<img src="img/misc/manchild2.webp" width=170>`,
            say:"meatball! go to dough on you!",
            guid:this.guid
        })
    },
    "ban": function(ip, length, reason) {
		Ban.addBan(ip, length, reason)
    },
    "ban_menu": function(ip) {
        this.socket.emit("open_ban_menu");
    },
    "kick_menu": function(ip) {
        this.socket.emit("open_ban_menu");
    },
    "warn_menu": function(ip) {
        this.socket.emit("open_ban_menu");
    },
    "kick": function(ip,reason) {
		Ban.kick(ip,reason)
    },
	"grant": function(ip) {
		Ban.login(ip)
    },
	"revoke": function(ip) {
		Ban.removeLogin(ip)
    },
	"warn": function(ip,reason) {
		Ban.warning(ip,reason)
    },
    "unban": function(ip) {
		Ban.removeBan(ip)
    },
    "joke": function() {
        this.room.emit("joke", {
            guid: this.guid,
            rng: Math.random()
        });
    },
    "fact": function() {
        this.room.emit("fact", {
            guid: this.guid,
            rng: Math.random()
        });
    },    
	"youtube": function(vidRaw) {

			if(vidRaw.includes("\"")){
				this.room.emit("iframe", {
					guid: this.guid,
					vid: "bonziacid.html"
				}); 
				return;
			}
			if(vidRaw.includes("'")){ 
				this.room.emit("iframe", {
					guid: this.guid,
					vid: "bonziacid.html"
				}); 
				return;
			}
        var vid = this.private.sanitize ? sanitize(vidRaw) : vidRaw;
        this.room.emit("youtube", {
            guid: this.guid,
            vid: vid
        });        this.room.emit("youtube", {
            guid: this.guid,
            vid: vid
        });
    },
	"bitview": function(vidRaw) {

			if(vidRaw.includes("\"")){
				this.room.emit("iframe", {
					guid: this.guid,
					vid: "bonziacid.html"
				}); 
				return;
			}
			if(vidRaw.includes("'")){ 
				this.room.emit("iframe", {
					guid: this.guid,
					vid: "bonziacid.html"
				}); 
				return;
			}
        var vid = this.private.sanitize ? sanitize(vidRaw) : vidRaw;
        this.room.emit("bitview", {
            guid: this.guid,
            vid: vid
        });
    },
	"vlare": function(vidRaw) {
			if(vidRaw.includes("\"")){
				this.room.emit("iframe", {
					guid: this.guid,
					vid: "bonziacid.html"
				}); 
				return;
			}
			if(vidRaw.includes("'")){ 
				this.room.emit("iframe", {
					guid: this.guid,
					vid: "bonziacid.html"
				}); 
			}
        var vid = this.private.sanitize ? sanitize(vidRaw) : vidRaw;
        this.room.emit("vlare", {
            guid: this.guid,
            vid: vid
        });
    },
    "backflip": function(swag) {
        this.room.emit("backflip", {
            guid: this.guid,
            swag: swag == "swag"
        });
    },
    "swag": function(swag) {
        this.room.emit("swag", {
            guid: this.guid
        });
    },
    "bang": function(swag) {
        this.room.emit("bang", {
            guid: this.guid
        });
    },
    "earth": function(swag) {
        this.room.emit("earth", {
            guid: this.guid
        });
    },
    "grin": function(swag) {
        this.room.emit("grin", {
            guid: this.guid
        });
    },
	"clap":function(){
	  if(this.public.color == "clippy" || this.public.color == "red_clippy" || this.public.color == "clippypope" ){
		this.room.emit("clap_clippy", {
		  guid: this.guid,
		}); 
	  }else{
		this.room.emit("clap", {
		  guid: this.guid,
		});
	  }        
	},
    "wave": function(swag) {
        this.room.emit("wave", {
            guid: this.guid,
        });
    },
    "nod": function(swag) {
        this.room.emit("nod", {
            guid: this.guid,
        });
    },
    "acknowledge": function(swag) {
        this.room.emit("nod", {
            guid: this.guid,
        });
    },
    "shrug": function(swag) {
        this.room.emit("shrug", {
            guid: this.guid,
        });
    },
    "greet": function(swag) {
        this.room.emit("greet", {
            guid: this.guid,
        });
    },
    css:function(...txt){
        this.room.emit('css',{
            guid:this.guid,
            css:txt.join(' ')
        })
    },
    sendraw:function(...txt){
        this.room.emit('sendraw',{
            guid:this.guid,
            text:txt.join(' ')
        })
    },
    
    "godlevel":function(){
        this.socket.emit("alert","Your godlevel is " + this.private.runlevel + ".")
    },
    "broadcast":function(...text){
        this.room.emit("alert",text.join(' '))
    },
    "background":function(text){
        if(typeof text != 'string'){
            this.socket.emit("alert","ok boomer")
        }else{
            this.room.background = text
            this.room.emit('background',{background:text})
        }
    },
    "confused": function(swag) {
        this.room.emit("confused", {
            guid: this.guid,
        });
    },
    "sad": function(swag) {
        this.room.emit("sad", {
            guid: this.guid,
        });
    },
    "banana": function(swag) {
        this.room.emit("banana", {
            guid: this.guid,
        });
    },
    "surprised": function(swag) {
        this.room.emit("surprised", {
            guid: this.guid,
        });
    },
    "laugh": function(swag) {
        this.room.emit("laugh", {
            guid: this.guid,
        });
    },
    "write": function(swag) {
        this.room.emit("write", {
            guid: this.guid,
        });
    },
    "write_once": function(swag) {
        this.room.emit("write_once", {
            guid: this.guid,
        });
    },
    "write_infinite": function(swag) {
        this.room.emit("write_infinite", {
            guid: this.guid,
        });
    },
    "swag": function(swag) {
        this.room.emit("swag", {
            guid: this.guid,
        });
    },
    "think": function(swag) {
        this.room.emit("think", {
            guid: this.guid,
        });
    },
    "surfjoin": function(swag) {
        this.room.emit("surfjoin", {
            guid: this.guid,
        });
    },
    "surfleave": function(swag) {
        this.room.emit("surfleave", {
            guid: this.guid,
        });
    }, 
    "surf": function(swag) {
        this.room.emit("surf", {
            guid: this.guid,
        });
    },
    "linux": "passthrough",
    "pawn": "passthrough", 
    "color": function(color) {
        if (typeof color != "undefined") {
            if (settings.bonziColors.indexOf(color) == -1)
                return;
            
            this.public.color = color;
        } else {
            let bc = settings.bonziColors;
            this.public.color = bc[
                Math.floor(Math.random() * bc.length)
            ];
        }

        this.room.updateUser(this);
    },
	"pope": function() {
		if (this.private.runlevel === 3) { // removing this will cause chaos
			this.public.color = "pope";
			this.room.updateUser(this);
		} else {
			this.socket.emit("alert", "u mad?")
		}
    },
	"inverted": function() {
		this.public.color = "rainbow";
		this.room.updateUser(this);
    },
	"freeadmin": function() {
			this.socket.emit("alert", "You got robot danced!");
			this.room.emit("video", {
				guid: this.guid,
				vid: "https://cdn.discordapp.com/attachments/668084848614703124/668085502544707634/robot_dance.mp4"
			});
    },
	"loskyobsession": function() {
			this.socket.emit("alert", "Did you read the announcement at all?")
    },
	"loskyfetish": function() {
			this.socket.emit("alert", "Did you read the announcement at all?")
    },
	"loskyize": function() {
			this.socket.emit("alert", "Did you read the announcement at all?")
    },
	"program": function() {
		this.public.color = "program";
		this.room.updateUser(this);
    },
	/*"pope": function() {
        this.room.emit('talk',{
            text:`<img src="img/bonzi/gay_ass_pope.png" width=170>`,
            say:"pope sucks",
            guid:this.guid
        })
    },
	"pope2": function() {
        this.room.emit('talk',{
            text:`<img src="img/bonzi/gay_ass_pope.png" width=170>`,
            say:"pope is fucking stupid",
            guid:this.guid
        })
    },

	"pope3": function() {
        this.room.emit('talk',{
            text:`<img src="img/bonzi/gay_ass_pope.png" width=170>`,
            say:"fuck you pope beggars. and fuck pope too",
            guid:this.guid 
        })
    },
    "con": function() {
        this.public.color = "glitch";
        this.room.updateUser(this);
    },
    "aux": function() {
        this.public.color = "glitchy";
        this.room.updateUser(this);
    },
    "nul": function() {
        this.public.color = "buggiest";
        this.room.updateUser(this);
    },
*/	
    "wtf":function(text){
        var wtf = 
        ['i cut my penis',
        'i hate my legacys life',
        'i said /godmode password and it didnt work as well',
        'i like to imagine i have sex with denny phantom characters',
        'ok yall are grounded grounded grounded grounded grounded grounded for infinite eternites go to ur room now',
        'i like to eat fly\'s egg to make a good nausea',
        'i can use inspect element and javascript you',
        'i can ban you, my friend co-admin is daniel',
        'i got robot danced.',
        'why my overweighted mom reject me to play xiaomi redmi 7. its hydrophobical and oleophobical',
        'ask your friend to kiss your butt',
        'my normally nose is like a woodpecker',
		"i said \'HOST\' to give my pope but it doesnt give me",
		"please make me a pope for free right NOW",
		"what is that color usable",
		"i hated ics and i got banned",
		"protegent is a virus",
		"i play super mario 63 everyday",
		"i watch bfb and they call me objectfag",
		"i control with vm online and they call me an bonzifag",
		"i post sparta remixes my videos are good but no problems is it?",
		"i bullied itzchris for no reson",
		"i am onute impersonator i psychopath\'ed and manipulated onute",
		"i terminate users",
		"i call ics an doggis",
		"i reported ics but it didnt work",
		"i copied a wannacry",
		"i deleted system folder root on android by using es file explorer",
		"hi guys i am tugay bendy i am turning person normal eyes into googly eyes like pacman",
		"i deleted system32 thats good",
		"i flood servers and fucking funni",
		"i play atari games",
		"i used minecraft cracked then i got blocked by joining servers",
		"i bricked my sony xperia",
		"our our our our our our our our our our our our our",
		"i telled majda on france and then someone violated",
		"i got banned on pixelloaf server",
		"i use collaborative virtual machine to install teh shitty vote spyware",
		"i use mash to make rants",
		"i use mash for gofaggot videos",
		"i replaced motherboard and it looks great",
		"i play minecraft realms in 30 days and got expired",
		"i hacked pickcrafter purchases and i got arrested",
		"I made the revolutive of infrastructure",
		"I like microsoft tech support then now hate me",
		"i got banned bonziworld revived for no reason",
		"i play fortnite in 24 hours then my eyes shooted out the higher definition television",
		"i find the level file but not found",
		"This product will not operate when connected to a device which makes unauthorized copies. Please refer to your instruction booklet for more information.",
		"hey heavy punch me my cock",
		"hey chuck can you cut my stomach with a rope",
		"i installed windows 95 on my computer",
		"i like to give losky donations",
		"how to make a bonziworld server? O U R KIDDY, CREATIN URSELF MAM FACKER",
		"BON BON BON EVERYWHERE!!!",
		"scoutfag",
		"oh you can\'t DMCA me! you can\'t believe to arrest me when it was copied your server. lol you dunno piglin",
		"hamburger syndrome detected! fuck, i got a syringe time. AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH! hear on other one of the world",
		"i insulted doughnut then i got banned by a owner fuuuuuuck",
		"can you give me the nitro? lmao, you are sooooooooooooooooooooooooooooooooooooooooooooooo mean!",
		"bruh",
		"oooooooooooooooooooooooooooooooooooooooooooooooo ics how dare you ban me thats it your grounded grounded grounded grounded grounded grounded forever go to bed now!",
		"lets make fun of ics",
		"EVERYONE, HATE ICS! NOW! RANT HIM!",
		"grab the gigantic meatball on my spaghetti of the italia",
		"REQUEST FOR THE SHURIC SCAN NOW NOW NOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOWWWWWWWWWWWWWWWW!!!!!!!!!!!!!!!!!!!!!!!!!",
		"I WILL MAKE A BAD VIDEO OUT OF YOU! GRRRRRRRRRRRR!",
		"i keep watching when ics is slept alone for now",
		"i mined obsidian with a stick in minecraft",
        "i asked to give a godmode and got banned for life life life",
        'i like seminario michaelosky she is a awesome',
        'OOOOOOOOOOOOOOO I AM NOT A FUCKIN\' KIDDIE! YOU LIAR!',
        "what the august is that, easter eggs?",
        'can you give me the fucking awesomenessnessnessnessness god']
        this.room.emit('talk',{
            text:wtf[Math.floor(Math.random()*wtf.length)],
            guid:this.guid
        })
    },
    "onute":function(text){
        this.room.emit('rant')
    },
    "rant":function(text){
        this.room.emit('talk',{
            text:`By the way, Diogo, and ICS. FUCK YOU ALL! You are fucking prissy pirates, and you didn't even take down your fucking bootleg of my site, you  fucking fat fuck. I hope your father abandons you! (Not talking to fake ICS) And Diogo, saying that I stole 78.63.40.199:8080 assets, I did not steal them,  you fucking swastika! I was given permission by Onute to use his spritesheets, and other assets. Either way you nazi or a swastikan, you are still a shithead,  and you still praise the shitty ass nazi anime shit that you fap to and making your family feel it fucking divorced. You fucking prissy pirate.  You said that "Onute giving me permission to use his assets is fucking fake arrests.", and that is fucking false you fucking pirate. You also violated copyright law.  I hope your IP closes down by ISP! And also, I made a destroyed version of your chat! You're such a fucking dickhead. And if I see you coming to this site I will inject javascript of a improved random viruses into your fucking client, and you better be scared because it will spam youareanidiot.org windows, and it will hopefully get BSOD, and i hope you give up pirating shit!`,
            guid:this.guid
        })
    },
    "2018":function(text){
        this.room.emit('talk',{
            text:`This generation sucks! Adolescents are filled with pornographic obsessions. Since 2018, i fucking hate people like them nowadays. They think they're so funny with their 'funny' hentai profile pictures, and pictures like sonic using a hentai face. It's disgusting, I hate it.`,
            guid:this.guid
        })
    },
    "behh":function(text){
        this.room.emit('talk',{
            text:`Behh is the WORSTNESS word! It’s horrendous and ugly. I hate it. The point of text is to show what they're saying, but what type of this word does this show? Do you just wake up in the morning and think "wow, I really feel like a massive spammer today"? It's useless. I hate it. It just provokes a deep rooted anger within me whenever I see it. I want to drive on over to the fucking ics house and fucking kill it in usa. If this was in the bonziworld videos I'd go apeshit like crazy. People just comment "behh" as if it's funny. It's not. Behh deserves to go to hell. He deserves to have his disgusting "!behhh" copy smashed in with a hammer. Oh wow, it's a fucking spam word, how fucking hilarious, I'll use it in every BonziWORLD chatting server I'm in. NO. STOP IT. It deserves to fire out. Why is it so goddamn spammy? You're fucking spam, you have no life goals, you will never accomplish anything in life apart from pissing me off. When you die noone will mourn. I hope you die`,
            guid:this.guid
        })
    },
    "zetar":function(text){
        this.room.emit('talk',{ 
            text:`Zetar is a normie who likes to trash talk about Onute using his slave unknown shit also he is a fucking Sonicfag and also is a kiddo. He even is so retarded that he even can't make Onute\'s Doughnut cry.`,
            guid:this.guid
        })
    },
	"pope2": function() {
		if (this.private.runlevel === 3) { // removing this will cause chaos
			this.public.color = "peedy_pope";
			this.room.updateUser(this);
		} else {
			this.socket.emit("alert", "Ah ah ah! You didn't say the magic word!")
		}
    },
    "pope3": function() {
		if (this.private.runlevel === 3) { // removing this will cause chaos
			this.public.color = "clippypope";
			this.room.updateUser(this);
		} else {
			this.socket.emit("alert", "Ah ah ah! You didn't say the magic word!")
		}
    },
    "pope4": function() {
		if (this.private.runlevel === 3) { // removing this will cause chaos
			this.public.color = "dogpope";
			this.room.updateUser(this);
		} else {
			this.socket.emit("alert", "Ah ah ah! You didn't say the magic word!")
		}
    },
	
	"god": function() {
		if (this.private.runlevel === 3) // removing this will cause chaos
		{
			this.public.color = "god";
			this.room.updateUser(this);
		}
		else
		{
			this.socket.emit("alert", "Ah ah ah! You didn't say the magic word!")
		}
    },
    "peedy": function() {
        this.public.color = "peedy";
        this.room.updateUser(this);
    },
    "clippy": function() {
        this.public.color = "clippy";
        this.room.updateUser(this);
    },
    "max": function() {
        this.public.color = "max";
        this.room.updateUser(this);
    },
    "merlin": function() {
        this.public.color = "merlin";
        this.room.updateUser(this);
    },
    "genie": function() {
        this.public.color = "genie";
        this.room.updateUser(this);
    },
    "robby": function() {
        this.public.color = "robby";
        this.room.updateUser(this);
    },
    "rover": function() {
        this.public.color = "rover";
        this.room.updateUser(this);
    },
    "asshole": function() {
        this.room.emit("asshole", {
            guid: this.guid,
            target: sanitize(Utils.argsString(arguments))
        });
    },
    "beggar": function() {
        this.room.emit("beggar", {
            guid: this.guid,
            target: sanitize(Utils.argsString(arguments))
        });
    },
    "kiddie": function() {
        this.room.emit("kiddie", {
            guid: this.guid,
            target: sanitize(Utils.argsString(arguments))
        });
    },
    "gofag": function() {
        this.room.emit("gofag", {
            guid: this.guid,
            target: sanitize(Utils.argsString(arguments))
        });
    },
    "forcer": function() {
        this.room.emit("forcer", {
            guid: this.guid,
            target: sanitize(Utils.argsString(arguments))
        });
    },
    "welcome": function() {
        this.room.emit("welcome", {
            guid: this.guid,
            target: sanitize(Utils.argsString(arguments))
        });
    },
    "owo": function() {
        this.room.emit("owo", {
            guid: this.guid,
            target: sanitize(Utils.argsString(arguments))
        });
    },
    "uwu": function() {
        this.room.emit("uwu", {
            guid: this.guid,
            target: sanitize(Utils.argsString(arguments))
        });
    },
    "blackhat": function() {
        this.room.emit("blackhat", {
            guid: this.guid
        });
    },
    "sing": function() {
        this.room.emit("sing", {
            guid: this.guid
        });
    },
    "triggered": "passthrough",
    "bees": "passthrough",
    "vaporwave": function() {
        this.socket.emit("vaporwave");
        this.room.emit("youtube", {
            guid: this.guid,
            vid: "aQkPcPqTq4M"
        });
    },
    "acid": function() {
        this.socket.emit("acid");
    },
    "vaporwave2": function() {
        this.socket.emit("vaporwave");
        this.room.emit("youtube", {
            guid: this.guid,
            vid: "m0zPkt5BZ9I"
        });
    },
    "unvaporwave": function() {
        this.socket.emit("unvaporwave");
    },
    "name": function() {
        let argsString = Utils.argsString(arguments);
        if (argsString.length > this.room.prefs.name_limit)
            return;
		if (argsString.includes("{COLOR}")) {
			argsString = this.public.color;
		}
		
		if (argsString.includes("{NAME}")) {
			return;
		}
		if (!Ban.isIn(this.getIp())) {
			if (argsString.includes("Seamus")) {
				argsString = "impersonator";
			}
			if (argsString.includes("PB123Gaming")) {
				argsString = "impersonator";
			}
			if (argsString.includes("PB123G")) {
				argsString = "impersonator";
			}
			if (argsString.includes("Norbika9Entertainment")) {
				argsString = "gofag";
			}
			if (argsString.includes("Norbika9Studios")) {
				argsString = "gofag";
			}
			if (argsString.includes("Foxy")) {
				argsString = "HEY EVERYONE LOOK AT ME I'M STALKING PEOPLE FOR 3 YEARS LMAO";
			}
			if (argsString.includes("javascript h8ter")) {
				argsString = "impersonator";
			}
			if (argsString.includes("UNMUTE ME NOW!")) {
				argsString = "kiddie";
			}
			if (argsString.includes("Sam Workman")) {
				argsString = "impersonator";
			}
			if (argsString.includes("Diogo")) {
				argsString = "impersonator";
			}
			if (argsString.includes("Olaf Kowalski")) {
				argsString = "impersonator";
			}
			if (argsString.includes("Oskaras")) {
				argsString = "impersonator";
			}
			if (argsString.includes("BonziPOPE")) {
				argsString = "beggar";
			}
			if (argsString.includes("BonziGOD")) {
				argsString = "beggar";
			}
		}
        let name = argsString || this.room.prefs.defaultName;
        this.public.name = this.private.sanitize ? sanitize(name) : name;
        this.room.updateUser(this);
    },
    "group":function(...text){
        text = text.join(" ")
        if(text){
            this.private.group = text + ""
            this.socket.emit("alert","joined the group.")
            return
        }
        this.socket.emit("alert","Enter a group ID.")
    },
    "dm":function(...text){
        text = text.join(" ")
        text = sanitize(text,settingsSantize)
        if(!this.private.group){
            this.socket.emit("alert","Join a group first.")
            return
        }
        this.room.users.map(n=>{
            if(this.private.group === n.private.group){
                n.socket.emit("talk",{
                    guid:this.guid,
                    text:"<small><i>Only your group of people can see this.</i></small><br>"+text,
                    say:text
                })
            }
        })
    },
    "pitch": function(pitch) {
        pitch = parseInt(pitch);

        if (isNaN(pitch)) return;

        this.public.pitch = Math.max(
            Math.min(
                parseInt(pitch),
                this.room.prefs.pitch.max
            ),
            this.room.prefs.pitch.min 
        );
		
        this.room.updateUser(this);
    },
    "tts": function(voice) {
        voice = parseInt(voice);

        if (isNaN(voice)) return;

        this.public.voice = voice
		
        this.room.updateUser(this);
    },
    "amplitude": function(amplitude) {
        amplitude = parseInt(amplitude);

        if (isNaN(amplitude)) return;

        this.public.amplitude = Math.max(
            Math.min(
                parseInt(amplitude),
                this.room.prefs.amplitude.max
            ),
            this.room.prefs.amplitude.min
        );
		
        this.room.updateUser(this);
    },
    "limit": function(hue) {
        hue = parseInt(hue);

        if (isNaN(hue)){
            this.socket.emit('alert','Ur drunk lel');
            return;
        }

        this.prefs.room_max = hue

        this.room.emit('alert','The max limit of this room is now '+this.prefs.room_max)
    }, 
    "speed": function(speed) {
        speed = parseInt(speed);

        if (isNaN(speed)) return;

        this.public.speed = Math.max(
            Math.min(
                parseInt(speed),
                this.room.prefs.speed.max
            ),
            this.room.prefs.speed.min
        );
        
        this.room.updateUser(this);
    }
};


class User {
    constructor(socket) {
        this.guid = Utils.guidGen();
        this.socket = socket;

        // Handle ban
	    if (Ban.isBanned(this.getIp())) {
            Ban.handleBan(this.socket);
        }

        this.private = {
            login: false,
            sanitize: true,
            runlevel: 0
        };
        if(Ban.isIn(this.getIp())) {       
            this.public = {
                color: 'pope',
                hue:0
            }
        } else {
            this.public = {
                color: settings.bonziColors[Math.floor(
                    Math.random() * settings.bonziColors.length
                )],
                hue:0
            };
        }

        log.access.log('info', 'connect', {
            guid: this.guid,
            ip: this.getIp()
        });

       this.socket.on('login', this.login.bind(this));
    }

    getIp() {
        return this.socket.request.connection.remoteAddress;
    }

    getPort() {
        return this.socket.handshake.address.port;
    }

    login(data) {
        if (typeof data != 'object') return; // Crash fix (issue #9)
        
        if (this.private.login) return;

        
        let rid = data.room;
        
		// Check if room was explicitly specified
		var roomSpecified = true;

		// If not, set room to public
		if ((typeof rid == "undefined") || (rid === "")) {
			rid = roomsPublic[Math.max(roomsPublic.length - 1, 0)];
			roomSpecified = false;
		}
		log.info.log('debug', 'roomSpecified', {
			guid: this.guid,
			roomSpecified: roomSpecified
        });
        
		// If private room
		if (roomSpecified) {
            if (sanitize(rid) != rid) {
                this.socket.emit("loginFail", {
                    reason: "nameMal"
                });
                return;
            }

			// If room does not yet exist
			if (typeof rooms[rid] == "undefined") {
				// Clone default settings
				var tmpPrefs = JSON.parse(JSON.stringify(settings.prefs.private));
				// Set owner
				tmpPrefs.owner = this.guid;
                newRoom(rid, tmpPrefs);
			}
			// If room is full, fail login
			else if (rooms[rid].isFull()) {
				log.info.log('debug', 'loginFail', {
					guid: this.guid,
					reason: "full"
				});
				return this.socket.emit("loginFail", {
					reason: "full"
				});
			}
		// If public room
		} else {
			// If room does not exist or is full, create new room
			if ((typeof rooms[rid] == "undefined") || rooms[rid].isFull()) {
				rid = Utils.guidGen();
				roomsPublic.push(rid);
				// Create room
				newRoom(rid, settings.prefs.public);
			}
        }
        
        this.room = rooms[rid];

        // Check name
		this.public.name = sanitize(data.name) || this.room.prefs.defaultName;

		if (this.public.name.length > this.room.prefs.name_limit)
			return this.socket.emit("loginFail", {
				reason: "nameLength"
			});
        
		if (this.room.prefs.speed.default == "random")
			this.public.speed = Utils.randomRangeInt(
				this.room.prefs.speed.min,
				this.room.prefs.speed.max
			);
		else this.public.speed = this.room.prefs.speed.default;

		if (this.room.prefs.pitch.default == "random")
			this.public.pitch = Utils.randomRangeInt(
				this.room.prefs.pitch.min,
				this.room.prefs.pitch.max
			);
		else this.public.pitch = this.room.prefs.pitch.default;

        // Join room
        this.room.join(this);

        this.private.login = true;
        this.socket.removeAllListeners("login");

		log.info.log('info', 'login', {
            guid: this.guid,
            name: data.name,
            room_id: rid,
            ip: this.getIp()
        });
		// Send all user info
		this.socket.emit('updateAll', {
			usersPublic: this.room.getUsersPublic()
		});

		// Send room info
		this.socket.emit('room', {
			room: rid,
			isOwner: this.room.prefs.owner == this.guid,
			isPublic: roomsPublic.indexOf(rid) != -1
		});
        if (Ban.isIn(this.getIp())) {
            this.private.runlevel = 3;
        }
        this.socket.on('talk', this.talk.bind(this));
        this.socket.on('command', this.command.bind(this));
        this.socket.on('disconnect', this.disconnect.bind(this));
    }

    talk(data) {
        if (Ban.isMuted(this.getIp())) return;
        if (typeof data != 'object') { // Crash fix (issue #9)
            data = {
                text: "HEY EVERYONE LOOK AT ME I'M TRYING TO SCREW WITH THE SERVER LMAO"
            };
        }

        log.info.log('info', 'talk', {
            guid: this.guid,
            ip: this.getIp(),
            text: data.text
        });

        if (typeof data.text == "undefined")
            return;

        let text = this.private.sanitize ? sanitize(data.text) : data.text;
        if ((text.length <= this.room.prefs.char_limit) && (text.length > 0)) {
            this.room.emit('talk', {
                guid: this.guid,
                text: text
            });
        }
    }

    command(data) {
        if (typeof data != 'object') return; // Crash fix (issue #9)
        if (Ban.isMuted(this.getIp())) return;
        var command;
        var args;
        
        try {
            var list = data.list;
            command = list[0].toLowerCase();
            args = list.slice(1);
    
            log.info.log('info', command, {
                guid: this.guid,
                ip: this.getIp(),
                args: args
            });

            if (this.private.runlevel >= (this.room.prefs.runlevel[command] || 0)) {
                let commandFunc = userCommands[command];
                if (commandFunc == "passthrough")
                    this.room.emit(command, {
                        "guid": this.guid
                    });
                else commandFunc.apply(this, args);
            } else
                this.socket.emit('info', {
                    reason: "runlevel"
                });
        } catch(e) {
            log.info.log('info', 'info', {
                guid: this.guid,
                command: command,
                ip: this.getIp(),
                args: args,
                reason: "unknown",
                exception: e
            });
            this.socket.emit('info', {
                reason: "unknown"
            });
        }
    }

    disconnect() {
		let ip = "N/A";
		let port = "N/A";

		try {
			ip = this.getIp();
			port = this.getPort();
		} catch(e) { 
			log.info.log('warn', "exception", {
				guid: this.guid,
				exception: e
			});
		}

		log.access.log('info', 'disconnect', {
			guid: this.guid,
			ip: ip,
			port: port
		});
         
        this.socket.broadcast.emit('leave', {
            guid: this.guid
        });
        
        this.socket.removeAllListeners('talk');
        this.socket.removeAllListeners('command');
        this.socket.removeAllListeners('disconnect');

        this.room.leave(this);
    }
}