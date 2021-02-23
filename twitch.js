/*
Total Amount Hours Streamed & Played: 4h 2m
*/

const {webFrame} = require('electron'); 
webFrame.setZoomFactor(1.25);

const code_name = 'twitch'; // code all characters will run at start
const party_names = ['Sinstrite', 'Cyborg', 'Android', 'Carbon']; // keep merchant first
const merchant_idle = [true, {map: 'main', x: 24, y: -140}];
const potion_types = ['hpot0', 'mpot0', 200]; // value is stack amount desired
const farm_monster = ['goo'];
const sell_whitelist = ['gslime', 'slimestaff'];
const merchant_name = party_names[0];
const farmer_names = [party_names[1], party_names[2], party_names[3]];
const keep_whitelist = [potion_types[0], potion_types[1], 'tracker'];
const monster_hunt_whitelist = [farm_monster[0]];

setInterval(function(){
    if(farmer_names.includes(character.name)){
        game_log(character.name + " has " + quantity('mpot0') + " mpot0's.");
    }
}, 10000);

// run all code only once
setTimeout(function(){
    if(character.name == merchant_name){
        start_farmers();
    }
}, 5000);

// run all code on a lopp
setInterval(function(){
    master_merchant(); // only merchant uses code 
    master_farmers(); // any farmer uses code
    master_global(); // any character uses code
}, 250);

function master_global(){
    use_potions();
    loot();
    if(character.rip){
        respawn();
    }
}

function use_potions(){
    var cur_hp = character.hp,
        cur_mp = character.mp,
        max_hp = character.max_hp,
        max_mp = character.max_mp,
        mpcost = character.mp_cost;
    if(cur_mp <= mpcost){ // immediately need to use a MP to be able to continue attacking, use skills, etc
        if(quantity(potion_types[1]) > 0){
            parent.use_skill('mp');
        }
    } else {
        if(cur_hp <= max_hp - parent.G.items[potion_types[0]].gives[0][1]){
            if(quantity(potion_types[0]) > 0){
                parent.use_skill('hp');
            }
        } else {
            if(cur_mp <= max_mp - parent.G.items[potion_types[1]].gives[0][1]){
                if(quantity(potion_types[1]) > 0){
                    parent.use_skill('mp');
                }
            }
        }
    }
    //do_potion_run();
}

function do_potion_run(){
    var potion_seller = get_npc_by_id('fancypots');
    if(character.map == potion_seller.map){
        var distance = distance_to_point(potion_seller.x, potion_seller.y, character.real_x, character.real_y);
        if(distance <= 300){
            sell_items();
            buy_potions();
        }
    }
    var do_potion_run = {}; // flag for when to buy potions
    var mp = potion_types[1];
    var hp = potion_types[0];
    var stack = potion_types[2];
    if(quantity(mp) <= 0){
        do_potion_run.mp = true;
    } else {
        do_potion_run.mp = false;
    }
    if(quantity(hp) <= 0){
        do_potion_run.hp = true;
    } else {
        do_potion_run.hp = false;
    }
    // if flag says any type of potion needs to be purchased
    if(do_potion_run.hp || do_potion_run.mp){
        if(character.map == potion_seller.map){
            if(distance <= 300){
                sell_items();
                buy_potions();
            } else {
                if(!smart.moving){
                    smart_move({to:"potions"},function(){ 
                        sell_items();
                        buy_potions();
                    });
                }
            }
        } else {
            if(!smart.moving){
                smart_move({to:"potions"},function(){ 
                    sell_items();
                    buy_potions();
                });
            } 
        }
    }
}

function buy_potions(){
    var mp = potion_types[1];
    var hp = potion_types[0];
    var stack = potion_types[2];
    var buy_hp_amt = stack - quantity(hp);
    var buy_mp_amt = stack - quantity(mp);

    if(character.gold >= parent.G.items[mp].g && buy_mp_amt > 0){
        parent.buy_with_gold(mp, stack - quantity(mp));
    }
    if(character.gold >= parent.G.items[hp].g && buy_hp_amt > 0){
        parent.buy_with_gold(hp, stack - quantity(hp));
    }
}

function get_npc_by_id(name){
    for(i in parent.G.maps){
        let map = G.maps[i];
        let ref = map.ref;
        for(j in ref){
            let data = ref[j];
            let id = data.id;
            if(id == name){
                return data;
            }
        }
    } return null;
}

function distance_to_point(x1, y1, x2, y2){
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

function master_merchant(){
    if(character.name == merchant_name){
        if(Object.keys(parent.party).length < party_names.length){
            create_party();
        }
        open_close_stand();
        if(merchant_idle[0]){
            merchant_handle_location_idle();
        }
        var potion_seller = get_npc_by_id('fancypots');
        if(character.map == potion_seller.map){
            var distance = distance_to_point(potion_seller.x, potion_seller.y, character.real_x, character.real_y);
            if(distance <= 300){
                sell_items();
                buy_potions();
            }
        }
    }
}

function open_close_stand(){
    if(character.moving){
        parent.socket.emit("merchant", { close: 1 });
    } else {
        parent.socket.emit("merchant", { num: locate_item('stand0') });
    }
}

function master_farmers(){
    if(farmer_names.includes(character.name)){
        accept_party_invite(merchant_name);
        send_items_to_merchant();
        handle_monster_hunting();
        request_potions();
    }
}

function send_gold_to_merchant(){
    var retain = retain_gold_amount();
    if(character.gold > retain){
        var send_amt = character.gold - retain;
        if(send_amt >= 1000){
            parent.socket.emit("send",{name:merchant_name,gold:send_amt});
        }
    }
}

function send_items_to_merchant(){
    var merchant = get_player(merchant_name);
    if(merchant != null){
        var distance = distance_to_point(merchant.real_x, merchant.real_y, character.real_x, character.real_y);
        if(distance <= 300){
            for(let i in character.items){
                let slot = character.items[i];
                if(slot != null){
                    let name = slot.name;
                    if(!keep_whitelist.includes(name)){
                        send_item(merchant_name, i, 9999);
                    }
                }    
            }
            send_gold_to_merchant();
        }
    } else {
        if(character.esize <= 5){
            request_merchant_visit();
        }
    }
}

function start_farmers(){
    parent.start_character_runner(farmer_names[0], code_name);
	parent.start_character_runner(farmer_names[1], code_name);
	parent.start_character_runner(farmer_names[2], code_name);  
}

function create_party(){
    send_party_invite(farmer_names[0]);
    send_party_invite(farmer_names[1]);
    send_party_invite(farmer_names[2]);
}

function farm_normally(){
    var target = get_targeted_monster();
    var desired_monster = get_nearest_monster({type:farm_monster[0], no_target: true});
    if(target){
        attack_monsters(target);
    } else {
        if(desired_monster){
            change_target(desired_monster);
        } else {
            var desired_monster = get_nearest_monster({type: farm_monster[0]});
            if(!desired_monster){
                if(!smart.moving){
                    smart_move(farm_monster[0]);
                }
            }
        }
    }
}

function handle_monster_hunting(){
    var npc = get_npc_by_id('monsterhunter');
    var npc_location  = {x: npc.x, y: npc.y, map: npc.map};
    if(character.s.monsterhunt == undefined){
        // go get a quest from daisy
        if(!smart.moving){
            smart_move(npc_location,function(){ 
                setTimeout(function(){
                    parent.socket.emit("monsterhunt");
                }, 250);
                setTimeout(function(){
                    parent.socket.emit("monsterhunt");
                }, 500);
            });
        }
    } else {
        // then we can do stuff n things
        var server = character.s.monsterhunt.sn; // example: "US III"
        var monster = character.s.monsterhunt.id; // example "mummy"
        var amount = character.s.monsterhunt.c; // example 5
        var time = character.s.monsterhunt.ms; // example 1768677 milliseconds
        var current_server = parent.server_region + ' ' + parent.server_identifier;
        // if we can successfully kill the quest monster
        if(monster_hunt_whitelist.includes(monster)){
            if(current_server == server){
                if(amount > 0){
                    var target = get_targeted_monster();
                    if(target){
                        attack_monsters(target);
                    } else {
                        var desired_monster = get_nearest_monster({type: monster});
                        if(!desired_monster){
                            if(!smart.moving){
                                smart_move(monster);
                            }
                        } else {
                            change_target(desired_monster);
                        }
                    }
                } else {
                    // we can turn in the quest
                    if(!smart.moving){
                        smart_move(npc_location,function(){ 
                            setTimeout(function(){
                                parent.socket.emit("monsterhunt");
                            }, 250);
                        });
                    }
                }
            }
        } else {
            // too hard to complete quest, farm normally
            farm_normally();
        }
    }
}


function attack_monsters(target){
    if(target){
        var distance = distance_to_point(target.real_x, target.real_y, character.real_x, character.real_y);
        if(distance <= character.range){
            if(can_attack(target)){
                attack(target);
            }
        } else {
            if(!character.moving){
                move(
                    character.real_x + (target.real_x - character.real_x) / 2,
                    character.real_y + (target.real_y - character.real_y) / 2
                );
            }
        }
    } else {
        if(desired_monster){
            change_target(desired_monster);
        }
    }
}


function retain_gold_amount(){
    var hp_gold = parent.G.items[potion_types[0]].g;
    var mp_gold = parent.G.items[potion_types[1]].g;
    var hp_total = hp_gold * potion_types[2];
    var mp_total = mp_gold * potion_types[2];
    var keep_gold = hp_total + mp_total;
    return keep_gold;
}

function request_merchant_visit(){
    var data = {
        message: 'come_here',
        location: {x: character.real_x, y: character.real_y, map: character.map},
    };
    send_cm(merchant_name, data);
}

function request_potions(){
    if(quantity(potion_types[0]) < 5 || quantity(potion_types[1]) < 5){
        var data = {
            message: 'bring_potions',
            location: {x: character.real_x, y: character.real_y, map: character.map},
            hpot: potion_types[2] - quantity(potion_types[0]),
            mpot: potion_types[2] - quantity(potion_types[1]),
            name: character.name,
        };
        send_cm(merchant_name, data);
    }
}

function on_cm(sender,data){
    if(data.message == "come_here"){
        if(!smart.moving){
            smart_move(data.location);
        }
    }
    if(data.message == "bring_potions"){
        var potion_seller = get_npc_by_id('fancypots');
        var potion_seller_location = {x: potion_seller.x, y:potion_seller.y, map:potion_seller.map};
        if(!smart.moving){
            smart_move(potion_seller_location,function(){ 
                // buy pots needed
                buy_with_gold(potion_types[0], data.hpot);
                buy_with_gold(potion_types[1], data.mpot);
                smart_move(data.location,function(){ 
                    // delivers to requester
                    send_item(data.name, locate_item(potion_types[0]), data.hpot);
                    send_item(data.name, locate_item(potion_types[1]), data.mpot);
                });
            });
        }
    }
}

function locate_item(name){
    for(let i in character.items){
        let slot = character.items[i];
        if(slot != null){
            let item = slot.name;
            if(item == name){
                return i;
            }
        }
    } 
    return null;   
}

function sell_items(){
    for(let i in character.items){
        let slot = character.items[i];
        if(slot != null){
            let name = slot.name;
            if(sell_whitelist.includes(name)){
                parent.sell(i, 9999);
            }
        }
    }
}

function merchant_handle_location_idle(){
    var location = merchant_idle[1];
    if(character.map != location.map){
        if(!smart.moving){
            smart_move(location);
        } 
    } else {
        var distance = distance_to_point(location.x, location.y, character.real_x, character.real_y);
        if(distance >= 10){
            if(!smart.moving){
                smart_move(location);
            }
        }
    }
}