var dotGlow = document.createElement('div');
dotGlow.classList.add('bp-dot-glow');

let settings = Blackprint.settings;
let cableGlowDuration = 1000; // visualizeFlow.duration
let cableGlowFrame = 4; // visualizeFlow.frame
let cableGlowThrottle = 200; // visualizeFlow.throttle
let cableGlowStartLength = true; // visualizeFlow.startLength

class Cable extends Blackprint.Engine.Cable {
	constructor(obj, port, _unshift=false){
		super(port);
		this._scope = port._scope;

		this.connected = false;
		this.valid = true;
		this.hasBranch = false;
		this.selected = false;
		this._destroyed = false;
		this._inactive = false;
		this.beforeConnect = null;

		this.typeName = !port.type ? 'Any' : port.type.name;
		this.source = port.source;

		if(port.iface.node.instance.constructor === Blackprint.Engine) return;

		var container = this._container = port._scope('container');
		this._cablesModel = this._scope('cables');

		var Ofst = container.offset;
		if(obj instanceof Cable){
			this.parentCable = obj;
			obj = {x: obj.head2[0], y: obj.head2[1]};
			_unshift = true;
		}

		let windowless = Blackprint.settings.windowless || port.iface.node.instance.pendingRender;

		let x = windowless ? 100 : (obj.x - container.pos.x - Ofst.x) / container.scale;
		let y = windowless ? 100 : (obj.y - container.pos.y - Ofst.y) / container.scale;
		this.linePath = `${x} ${y} ${x} ${y}`;

		this.head1 = this.parentCable ? this.parentCable.head2.slice(0) : [x, y];
		this.head2 = this.head1.slice(0); // Copy on same position

		// Push to cable list
		var list = port._scope('cables').list;

		if(_unshift)
			list.unshift(this);
		else list.push(this);

		this._ownerCableList = list;
		this.moveCableHead = this.moveCableHead.bind(this);
	}

	// Get SVG Path element
	get pathEl(){
		if(Blackprint.settings.windowless || this.owner.iface.node.instance.pendingRender) return null;

		if(this._pathEl == null || !this._pathEl.isConnected){
			if(this._ownerCableList.$EM == null) return;

			let temp = this._ownerCableList.getElement?.(this);
			if(temp == null) return null;

			this._pathEl = temp.firstElementChild;
		}

		return this._pathEl;
	}

	async visualizeFlow(){
		if(settings.visualizeFlow === false) return;
		if(this.pathEl == null || window.Timeplate === void 0) return;
		if(this.output === void 0 || this._destroyed) return;

		if(settings.visualizeFlow_duration != null)
			cableGlowDuration = settings.visualizeFlow_duration;

		if(settings.visualizeFlow_frame != null)
			cableGlowFrame = settings.visualizeFlow_frame;

		if(settings.visualizeFlow_throttle != null)
			cableGlowThrottle = settings.visualizeFlow_throttle;

		if(settings.visualizeFlow_startLength != null)
			cableGlowStartLength = settings.visualizeFlow_startLength;

		if(cableGlowThrottle !== 0){
			if(this._delayGlow) return;
			this._delayGlow = true;
		}

		let cableScope = this._scope('cables');
		var glowContainer = cableScope.$el('.glow-cable');

		await $.afterRepaint();

		if(cableScope.minimapCableScope !== void 0)
			glowContainer = [...glowContainer, ...cableScope.minimapCableScope.$el('.glow-cable')];

		var els = new Array(glowContainer.length);
		for (let i=0; i < glowContainer.length; i++) {
			let el = els[i] = getIdleCableGlow();
			let container = glowContainer[i];

			if(el.parentNode === container) continue;
			container.append(el);
		}

		// Generate new variations if not exist
		if(cableGlowKeyframes == null){
			let variations = cableGlowKeyframes = new Array(30);
			for (let i=0; i < variations.length; i++) {
				let keyframes = variations[i] = new Array(cableGlowFrame+3);

				var o = 1/(keyframes.length - 1);
				for (var a = 2, n=cableGlowFrame+2; a <= n; a++) {
					keyframes[a] = {
						offset: o*a,
						translate: [random(-15, 15)+'px', random(-15, 15)+'px'],
					};
				}

				keyframes[0] = {offset: 0, offsetPath: null, offsetDistance: '1%'};
				keyframes[1] = {offset:0.02, visibility: 'hidden'};
				keyframes[2].visibility = 'visible';
				keyframes[cableGlowFrame+2] = {offset: 1, translate: 0, offsetPath: null, scale: 1, offsetDistance: '100%'};
			}
		}

		let path = this.pathEl.getAttribute('d');
		if(this.parentCable != null){
			this._glowing = true; // Force single glow element

			let deep = this.parentCable;
			do {
				path = deep.pathEl.getAttribute('d') + ' ' + path;
				deep = deep.parentCable;
			} while(deep != null);
		}

		let keyframes = incrementalGet(cableGlowKeyframes);
		let offsetPath = `path('${path}')`;
		let first = keyframes[0];
		let last = keyframes[6];
		first.offsetPath = last.offsetPath = offsetPath;

		// reverse if owner is not the output port
		if(this.owner !== this.output){
			first.offsetDistance = '100%';
			last.offsetDistance = '1%';
		}

		let anim = Timeplate.for(els, keyframes, {delay: 100});
		anim.duration = cableGlowDuration;
		anim.play();

		super.visualizeFlow();

		if(cableGlowThrottle !== 0)
			setTimeout(() => this._delayGlow = false, cableGlowThrottle);

		if(cableGlowStartLength){
			this._deglow ??= () => this._glowing = false;
			if(!this._glowing){
				this._glowing = true;
				this._glow = true;

				let i = 0;
				let temp = setInterval(()=> {
					this._delayGlow = false;
					this.visualizeFlow();

					if(++i >= 2) {
						clearInterval(temp);
						this._glow = false;
					}
				}, 100);

				this._reglow = setTimeout(this._deglow, cableGlowDuration+1000);
			}
			else if(!this._glow){
				clearTimeout(this._reglow);
				this._reglow = setTimeout(this._deglow, cableGlowDuration+1000);
			}
		}
	}

	moveCableHead(ev, single){
		let { _container, branch } = this;
		let { offset: Ofst, pos, scale } = this._container;
		let { hoverPort } = this._cablesModel;

		// Let's make a magnet sensation (fixed position when hovering node port)
		if(!single && hoverPort !== false && (branch == null || branch.length === 0)){
			var center = hoverPort.rect.width/2;
			this.head2 = [
				(hoverPort.rect.x + center - pos.x - Ofst.x) / scale,
				(hoverPort.rect.y + center - pos.y - Ofst.y) / scale
			];

			this.beforeConnect = null;
			this._scope.sketch.emit('port.cable.test', {
				cable: this,
				port: this.owner,
				target: hoverPort.item,
				instance: this._scope.sketch,
				handler: fn => {
					this.beforeConnect = fn;
				}
			});
		}

		// Follow pointer
		else{
			if(!single) {
				this.head2 = [
					(ev.clientX - pos.x - Ofst.x) / scale,
					(ev.clientY - pos.y - Ofst.y) / scale
				];

				_container.moveSelection(ev, this);
			}
			else {
				this.head2[0] += ev.movementX / scale;
				this.head2[1] += ev.movementY / scale;
			}

			this.beforeConnect = null;
		}

		if(branch !== void 0 && branch.length !== 0){
			for (var i = 0; i < branch.length; i++) {
				let _cable = branch[i];
				if(_cable.head1 === this.head2) continue;

				_cable.head1 = this.head2;
			}
		}
	}

	cableHeadClicked(ev, isCreating){
		ev.stopPropagation();

		if(!isCreating && ev.ctrlKey){
			var evTemp = { event: ev, type: 'cableHead', cable: this };
			this._scope.sketch.emit('cable.create.branch', evTemp);

			let newCable = this.createBranch(ev);
			evTemp.newCable = newCable;

			return newCable;
		}

		var container = this._container;
		var cablesModel = this._cablesModel;

		var Ofst = container.offset;
		var cable = this;

		if(!ev.noMoveListen){
			var elem = cablesModel.list.getElement(cable);

			// Let the pointer pass thru the current svg group
			if(elem !== void 0){
				elem = $(elem);
				elem.css('pointer-events', 'none');
			}

			// Save current cable for referencing when cable connected into node's port
			cablesModel.currentCable = cable;

			var space = $(ev.target.closest('sf-space'));
			space.on('pointermove', this.moveCableHead).once('pointerup', ev => {
				space.off('pointermove', this.moveCableHead);

				// Add delay because it may be used for connecting port
				setTimeout(function(){
					cablesModel.currentCable = void 0;
				}, 100);

				if(elem !== void 0)
					elem.css('pointer-events', '');

				this._scope.sketch.emit('cable.dropped', {
					event: ev,
					port: cable.owner,
					cable,
					afterCreated: isCreating
				});
			});

			this._scope.sketch.emit('cable.drag', { event: ev, cable });
		}

		if(isCreating){
			cable.head2 = [
				(ev.clientX - container.pos.x - Ofst.x) / container.scale,
				(ev.clientY - container.pos.y - Ofst.y) / container.scale
			];
		}

		if(ev.pointerType === 'touch') this._touchCable(ev);
	}

	cablePathClicked(ev){
		if(!ev.ctrlKey && !this._clicked){
			this._clicked = true
			setTimeout(()=> this._clicked = void 0, 400);
			return;
		}

		var evTemp = { event: ev, type: 'cablePath', cable: this };
		this._scope.sketch.emit('cable.create.branch', evTemp);

		let current = this;

		let cable, assignPosFor;
		if(!current.hasBranch){
			if(current.parentCable !== void 0){
				// Remove from old branch
				let parentBranch = current.parentCable.branch;
				parentBranch.splice(parentBranch.indexOf(current), 1);

				// Create new branch from the parent
				cable = current.parentCable.createBranch();
				cable.createBranch(void 0, current);

				// Make this as the selected cable
				current = cable;

				_resetCableZIndex(current.branch, this._scope('cables').list);
			}
			else{
				cable = current.createBranch();

				cable.cableTrunk = current;
				current._allBranch.push(current);
				current._inputCable.push(cable);

				if(current.input != null){
					// Swap from input port
					let list = current.input.cables || current.input.in;
					list[list.indexOf(current)] = cable;

					cable.target = cable.input = current.input;
					current.target = current.input = void 0;

					// Put it on output port
					if(cable.isRoute){
						let port = cable.cableTrunk.output;
						port.out = cable;
						port._outTrunk = cable.cableTrunk;
					}

					current.output.cables?.push(cable);
				}

				cable.connected = current.connected;
				cable.parentCable = current;
				current.connected = false;
				current.hasBranch = true;

				assignPosFor = cable.head1;
			}
		}
		else{
			if(current.parentCable && (current.branch == null || current.branch.length === 0)){
				cable = current.parentCable.createBranch();

				let parentBranch = current.parentCable.branch;
				parentBranch[parentBranch.indexOf(current)] = cable;

				cable.branch = [current];
				current = cable;

				current.parentCable = cable;
				assignPosFor = cable.head1;
			}
			else{
				cable = current.createBranch();
				current.branch.pop();

				let branch = cable.branch = current.branch;
				for (var i = 0; i < branch.length; i++) {
					branch[i].parentCable = cable;
				}

				cable.hasBranch = true;
				current.branch = [cable];

				_resetCableZIndex(current.branch, this._scope('cables').list);
				assignPosFor = cable.head1;
			}
		}

		current.cableHeadClicked({
			stopPropagation(){ev.stopPropagation()},
			type: ev.type,
			noMoveListen: ev.noMoveListen,
			pointerType: ev.pointerType,
			target: current.pathEl,
			clientX: ev.clientX,
			clientY: ev.clientY,
		}, true);

		evTemp.newCable = current;

		// Don't use Object.assign
		if(assignPosFor !== void 0){
			let temp = current.head2;
			let temp2 = assignPosFor;
			temp2[0] = temp[0];
			temp2[1] = temp[1];
		}
	}

	createBranch(ev, cable){
		if(this.source !== 'output')
			throw new Error("Cable branch currently can only be created from output port");

		this.hasBranch = true;
		this.cableTrunk ??= this;
		this.branch ??= [];

		this._allBranch ??= []; // All cables reference
		this._inputCable ??= []; // All input port IFace reference

		let newCable = cable || new Cable(this, this.owner);
		newCable._allBranch = this._allBranch; // copy reference
		newCable._inputCable = this._inputCable; // copy reference
		newCable.cableTrunk = this.cableTrunk; // copy reference

		if(this.source === 'output')
			this.output = newCable.output = this.owner;

		this._allBranch.push(newCable);
		this.branch.push(newCable);
		newCable.parentCable = this;
		newCable.isRoute = this.isRoute;
		newCable.source = this.source;

		if(ev !== void 0)
			newCable.cableHeadClicked(ev, true);

		if(this.isRoute){
			setTimeout(() => {
				if(this.branch.length > 1) this.branch[0].disconnect();
			}, 10);
		}

		return newCable;
	}

	detachPort(port){
		if(!port) port = this.target;
		if(!port) return;
		
		super.disconnect();
		let owner = this.input === port ? 'output' : 'input';

		// Reset some state
		delete this.input;
		delete this.output;
		if(this.owner === port){
			this.owner = this.target;

			let { head1, head2 } = this;
			let temp = head1.slice(0);
			head1[0] = head2[0];
			head1[1] = head2[1];
			head2[0] = temp[0];
			head2[1] = temp[1];
		}

		this.source = this.owner.source || owner;
		delete this.target;

		if(this.isRoute){
			this.forceRecreate = true;
			if(this.owner instanceof Blackprint.RoutePort){
				if(owner === 'output') this.owner.out = this;
				else this.owner.in.push(this);
			}
		}
		else this.owner.cables.push(this);
	}

	_touchCable(oldEv){
		let lastEl = null;
		function hoverSimulate(ev){
			let touch = ev.touches[0];
			let el = document.elementFromPoint(touch.clientX, touch.clientY);

			if(lastEl === el) return;
			if(lastEl !== null)
				$(lastEl).trigger('pointerout');

			lastEl = el;
			$(el).trigger('pointerover');
		}

		let port = this.owner;
		port._ignoreConnect = true;

		let container = this._scope('container');
		let cable = this;
		container.$el.on('touchmove', hoverSimulate).once('pointerup', function(ev){
			container.$el.off('touchmove', hoverSimulate);

			let hovered = container.cableScope.hoverPort;
			if(hovered !== false){
				if(hovered.item === port)
					cable._delete();
				else
					hovered.item.connectCable(cable);

				container.cableScope.hoverPort = false;
			}
			else {
				if(Math.abs(oldEv.clientX - ev.clientX) < 20
				   && Math.abs(oldEv.clientY - ev.clientY) < 20){
					cable._delete();
				}
			}

			setTimeout(()=> {
				port._ignoreConnect = void 0;
			}, 500);
		});
	}

	_connected(){
		super._connected();

		if(this._allBranch !== void 0){
			if(this.source === 'input'){ // This may never be called for now
				// Sync output port to every branch
				/*let cables = this._allBranch;
				for (var i = cables.length-1; i >= 0; i--) {
					let cable = cables[i];
					cable.output = this.output;
				}*/

				throw new Error("Not implemented");
			}

			this._inputCable.push(this);

			if(this.isRoute){
				let port = this.cableTrunk.output;
				port.out = this;
				port._outTrunk = this.cableTrunk;
			}

			this.cableTrunk.output.cables?.push(this);
		}

		// Recheck inactive node
		if(!this.isRoute){
			let inputIface = this.input.iface;
			inputIface.node.routes._checkInactiveNode(inputIface);
		}
	}

	_delete(isDeep){
		this._scope.sketch.emit('cable.deleted', {cable: this});

		if(this.isRoute && this.owner != null){
			if(this.owner.out === this) this.owner.out = null;
			else {
				let list = this.owner.in || this.owner.cables;
				let i = list.indexOf(this);
				if(i !== -1) list.splice(i, 1);
			}
		}

		if(this.hasBranch){
			let branch = this.branch;
			for (var i = branch.length-1; i >= 0; i--)
				branch[i]._delete(true);
		}

		_deleteFromList(this._scope('cables').list, this);
		_deleteFromList(this._inputCable, this);
		_deleteFromList(this._allBranch, this);

		if(this.output !== void 0)
			_deleteFromList(this.output.cables, this);

		if(this.parentCable !== void 0){
			let branch = this.parentCable.branch;
			let i = branch.indexOf(this);

			if(i !== -1)
				branch.splice(i, 1);
		}

		if(this.input !== void 0)
			_deleteFromList(this.input.cables, this);

		if(isDeep && this._destroyed === false)
			super.disconnect();
	}

	cableMenu(ev){
		ev.stopPropagation();
		let cable = this;
		let scope = cable._scope;

		let suggestedNode;
		if(this.target === void 0){
			let owner = this.owner;
			suggestedNode = Blackprint.Sketch.suggestNodeForPort(owner);

			if(ev.ctrlKey) return suggestNode();
		}

		function suggestNode(){
			let menu = createNodesMenu(suggestedNode, scope.sketch, ev, null, {suggest: true});
			if(menu === false) return;

			scope('dropdown').show(menu, {x: ev.clientX, y: ev.clientY, event: ev});
		}

		let {owner, target} = cable;
		let menu = [{
			title: target ? "Disconnect" : "Delete",
			callback(){cable.disconnect()},
			hover(){
				owner.iface.$el.addClass('highlight');

				if(target)
					target.iface.$el.addClass('highlight');
			},
			unhover(){
				owner.iface.$el.removeClass('highlight');

				if(target)
					target.iface.$el.removeClass('highlight');
			}
		}];

		if(target === void 0 && !this.isRoute){
			menu.push({
				title: "Suggested Node",
				callback(){ setTimeout(suggestNode, 220) },
			});
		}

		if(cable.branch !== void 0 || cable.parentCable !== void 0){
			let resetRotation = cable.overrideRot && (
				cable.parentCable == null || cable.target != null
			);

			function recalculatePath(){
				cable._scope('cables').recalculatePath(cable);
			}

			let list = [{
				title: "Reset",
				callback(){
					delete cable.overrideRot;
					recalculatePath();
				},
			}];

			// direct cable from output port
			if(cable.parentCable == null){
				if(cable.target == null){
					list.push({
						title: "out-out",
						callback(){
							cable.overrideRot = 'out-out';
							recalculatePath();
						},
					});
				}
			}
			else {
				if(cable.target != null){ // direct cable to input port
					list.push({
						title: "in-in",
						callback(){
							cable.overrideRot = 'in-in';
							recalculatePath();
						},
					});
				}
				else {
					list.push({
						title: "out-out",
						callback(){
							cable.overrideRot = 'out-out';
							recalculatePath();
						},
					}, {
						title: "in-in",
						callback(){
							cable.overrideRot = 'in-in';
							recalculatePath();
						},
					}, {
						title: "in-out",
						callback(){
							cable.overrideRot = 'in-out';
							recalculatePath();
						},
					}, {
						title: "out-in",
						callback(){
							cable.overrideRot = 'out-in';
							recalculatePath();
						},
					});
				}
			}

			menu.push({
				title: "Override rotation",
				deep: list
			});
		}

		if(cable.branch !== void 0 && cable.branch.length === 1){
			menu.push({
				title: "Merge cable",
				callback(){
					let child = cable.branch[0];
					child.cableTrunk = child;
					child.head1 = cable.head1;

					if(cable.parentCable !== void 0){
						let branch = cable.parentCable.branch;
						branch[branch.indexOf(cable)] = child;
						child.parentCable = cable.parentCable;
					}
					else {
						let cables = cable.output.cables;

						if(cables.includes(child) === false)
							cables[cables.indexOf(cable)] = child;

						child.parentCable = void 0;
					}

					cable.branch = [];
					cable._delete();
				},
			});
		}

		scope('dropdown').show(menu, {x: ev.clientX, y: ev.clientY, event: ev});
	}

	disconnect(){
		super.disconnect();
		this._destroyed = true;
		this._delete();

		// Recheck inactive node
		if(this.isRoute){
			let owner = this.owner.iface;
			owner.node.routes._checkInactiveFromNode(owner);
		}
		else if(this.input != null){ // Not a route cable
			let inputIface = this.input.iface;
			inputIface.node.routes._checkInactiveNode(inputIface);
		}
	}
}

function _deleteFromList(list, item){
	if(list === void 0) return;

	let a = list.indexOf(item);
	if(a !== -1)
		list.splice(a, 1);
}

function _resetCableZIndex(branch, cableList){
	for (var i = 0; i < branch.length; i++) {
		let cable = branch[i];

		cableList.move(cableList.indexOf(cable), 0);

		if(cable.branch !== void 0)
			_resetCableZIndex(cable.branch, cableList);
	}
}

function random(a, b){ return Math.round(Math.random()*(b-a)*1000)/1000+a }

// In case you're using kind of debugging
// tools and think this was memory leak
// This feature can be disabled with
// Blackprint.settings('visualizeFlow', true);
let cableGlowKeyframes;
let cableGlowElCache = [];
let getIdleCableGlow = (function(){
	let idle = 0;
	let current = 0;
	let timeout = false;

	return function(){
		if(timeout === false) timeout = setTimeout(()=> {
			idle = current = 0;
			timeout = false;
		}, cableGlowDuration + 1000);

		if(current >= idle){
			if(idle >= cableGlowElCache.length)
				cableGlowElCache.push(dotGlow.cloneNode());

			idle++;
		}

		return cableGlowElCache[current++];
	}
})();

function incrementalGet(list){
	let i = list._i ??= 0;
	let temp = list[i];
	i = i + 1;
	if(i >= list.length) i = 0;
	list._i = i
	return temp;
}