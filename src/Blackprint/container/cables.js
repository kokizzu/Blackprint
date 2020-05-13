Space.model('cables', function(self, root){
	/*{
		head1:[x,y], -- Number
		head2:[x,y], -- Number
		type:'String',
		curve:self.curve[..],
		valid:true,

		nodeA:Object,
		nodeB:Object,
	}*/
	self.list = [];
	var container = self.container = root('container');

	// Fixing viewport position
	self.space = [0,0];
	self.init = function(){
		setTimeout(function(){
			// Get sf-space element
			var rect = self.$el[0].parentNode.getBoundingClientRect();
			self.space = [rect.x, rect.y];
		}, 500);
	}

	// Flag if cursor was hovering a node port
	self.hoverPort = false; // {elem:, item:}

	// This will run everytime the cable was moving
	self.recalculatePath = function(item){
		var x1 = item.head1[0], y1 = item.head1[1];
		var x2 = item.head2[0], y2 = item.head2[1];

		// Written without formula, just logic...
		if(item.source !== 'properties'){
			var cx = (x2-x1)/2;
			if(cx > -50 && cx < 0)
				cx = -50;
			else if(cx < 50 && cx >= 0)
				cx = 50;

			if(item.source === 'inputs'){
				if(x2 < x1)
				  item.linePath = `${x1 + cx} ${y1} ${x2 - cx} ${y2}`;
				else
				  item.linePath = `${x1 - cx} ${y1} ${x2 + cx} ${y2}`;
			}
			else if(item.source === 'outputs'){
				if(x2 < x1)
				  item.linePath = `${x1 - cx} ${y1} ${x2 + cx} ${y2}`;
				else
				  item.linePath = `${x1 + cx} ${y1} ${x2 - cx} ${y2}`;
			}
		}
		else{
			var cy = (y2-y1)/2;
			if(cy > -50 && cy < 0)
				cy = -50;
			else if(cy < 50 && cy >= 0)
				cy = 50;

			if(y2 < y1)
			  item.linePath = `${x1} ${y1 - cy} ${x2} ${y2 - cy}`;
			else
			  item.linePath = `${x1} ${y1 + cy} ${x2} ${y2 + cy}`;
		}
	}

	// Move clicked cable
	self.currentCable = void 0;
	self.cableHeadClicked = function(item, eva){
		var Ofst = container.offset;

		function moveCableHead(ev){
			// Let's make a magnet sensation (fixed position when hovering node port)
			if(self.hoverPort !== false){
				var center = self.hoverPort.rect.width/2;
				item.head2 = [
					(self.hoverPort.rect.x+center - container.pos.x) / container.scale + (Ofst.x + -Ofst.x/container.scale),
					(self.hoverPort.rect.y+center - container.pos.y) / container.scale + (Ofst.y + -Ofst.y/container.scale)
				];
			}

			// Follow pointer
			else item.head2 = [
				(ev.clientX - container.pos.x) / container.scale + (Ofst.x + -Ofst.x/container.scale),
				(ev.clientY - container.pos.y) / container.scale + (Ofst.y + -Ofst.y/container.scale)
			];
		}

		var elem = self.list.getElement(item);

		// Let the pointer pass thru the current svg group
		if(elem !== void 0){
			elem = $(elem);
			elem.css('pointer-events', 'none');
		}

		// Save current cable for referencing when cable connected into node's port
		self.currentCable = item;
		$('vw-sketch').on('pointermove', moveCableHead).once('pointerup', function(ev){
			$('vw-sketch').off('pointermove', moveCableHead);

			// Add delay because it may be used for connecting port
			setTimeout(function(){
				self.currentCable = void 0;
			}, 100);

			if(elem !== void 0)
				elem.css('pointer-events', '');
		});
	}

	self.cableMenu = function(cable, ev){
		ev.stopPropagation();

		root('dropdown').show([{
			title:"Disconnect",
			context:cable,
			callback:Cable.prototype.destroy,
			hover:function(){
				this.owner.node.$el.addClass('highlight');

				if(this.target)
					this.target.node.$el.addClass('highlight');
			},
			unhover:function(){
				this.owner.node.$el.removeClass('highlight');

				if(this.target)
					this.target.node.$el.removeClass('highlight');
			}
		}], ev.clientX, ev.clientY);
	}
});