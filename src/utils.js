// RepeatedProperty: from node input, output, or property list
function getPortRect(RP, name){
	if(RP.getElement === void 0)
		console.error("It seems the JSON was imported when sketch view haven't been loaded");

	return RP.getElement(name).querySelector('.port').getBoundingClientRect();
}

function deepProperty(obj, path, value, onCreate){
	var temp;
	if(value !== void 0){
		for(var i = 0, n = path.length-1; i < n; i++){
			temp = path[i];
			if(obj[temp] === void 0){
				obj[temp] = {};
				onCreate && onCreate(obj[temp]);
			}

			obj = obj[temp];
		}

		obj[path[i]] = value;
		return;
	}

	for(var i = 0; i < path.length; i++){
		if((obj = obj[path[i]]) === void 0)
			return;
	}

	return obj;
}

function deepCopy(target, source){
	for(var key in source){
		// Skip any character that contain $ or _
		// Because it's marked as private property
		if(key.includes('$') || key.includes('_'))
			continue;

		if(typeof source[key] === 'object'){
			if(source[key] instanceof Array)
				target[key] = [];
			else
				target[key] = {};

			deepCopy(target[key], source[key]);
			continue;
		}

		target[key] = source[key];
	}
}

const isClass = Blackprint._utils.isClass;

function isTouchDevice(){
	return navigator.maxTouchPoints !== 0;
}

function createNodesMenu(list, sketch, ev){
	var menu = [];
	var strArr = [];
	function deep(obj, target){
		for(var name in obj){
			let that = obj[name];
			if(that == null || that.hidden || that.disabled)
				continue;

			if(that.constructor === Function){
				target.push({
					title: name,
					args: [strArr.length !== 0 ? strArr.join('/')+'/'+name : name],
					callback: createNode
				});
				continue;
			}

			var newMenu = [];

			strArr.push(name);
			deep(that, newMenu);
			strArr.pop();

			newMenu = newMenu.sort((a, b) => a.title < b.title ? -1 : 1);
			target.push({title: name, deep: newMenu});
		}
	}

	let container = sketch.scope('container');
	function createNode(namespace){
		sketch.createNode(namespace, {
			x: ev.offsetX - container.offset.x,
			y: ev.offsetY - container.offset.y
		});
	}

	deep(list, menu);

	menu = menu.sort((a, b) => a.title < b.title ? -1 : 1);
	menu.event = ev;
	return menu;
}