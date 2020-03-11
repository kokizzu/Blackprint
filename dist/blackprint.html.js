/* Blackprint 
 MIT Licensed */

if(window.templates === void 0)window.templates = Object.create(null)
window.templates['Blackprint/page.html'] = '<sf-space blackprint>\n  <!-- Put the cables behind the nodes -->\n  <sf-m name="cables" class="cables" id="test">\n    <svg style="transform: translate(-{{space[0]}}, -{{space[1]}}px)">\n      <g sf-repeat-this="x in list" class="{{ x.type }} {{ x.valid ? \'\' : \'invalid\' }}">\n        <path\n            d="M {{ recalculatePath(x) || x.head1[0] + \' \' + x.head1[1] }}\n               C {{ x.linePath }},\n                 {{ recalculatePath(x) || x.head2[0] + \' \' + x.head2[1] }}"\n        ></path>\n        <circle\n            @pointerdown="cableHeadClicked(x, event)"\n            transform="translate({{x.head2[0]}}, {{x.head2[1]}})"\n        ></circle>\n      </g>\n    </svg>\n  </sf-m>\n\n  <!-- Nodes goes here -->\n  <sf-m name="nodes" class="nodes" style="user-select:none;">\n    <!-- Handled on ./nodes.js -->\n    <div sf-repeat-this="item in list">\n      {{@exec\n        var type = item.type[0].toUpperCase() + item.type.slice(1);\n        var node = window["$"+type+\'Node\'];\n\n        if(node === void 0){\n          console.error(item, "type not found");\n          @return null;\n        }\n\n        // Create from Blackprint\'s namespace and (true = let the item become the scope)\n        @return new node(item, Blackprint.space, true); \n      }}\n    </div>\n  </sf-m>\n</sf-space>'
window.templates['Blackprint/nodes/button.html'] = '<button-node class="node trigger" style="transform: translate({{ x }}px, {{ y }}px)">\n  <div class="header" @dragmove="moveNode(event)">\n    <div class="title"><div class="icon"></div><div class="text">{{ title }}</div></div>\n    <div class="description">{{ description }}</div>\n  </div>\n\n  <div class="content">\n    <div class="button" @click="run(event)">\n      <div class="arrow"><img src="/assets/img/icon/trigger-button.png" alt="" /></div>\n      <a>Trigger</a>\n    </div>\n\n    <div class="right-port">\n      <!-- Container for output -->\n      <div class="output">\n        <div class="ports {{ x.type.name }}" sf-repeat-this="x in outputs">\n          <div class="name">{{ x.name }}</div>\n          <div class="port"\n              @pointerdown="createCable(event, x)"\n              @pointerup="cableConnect(x)"\n              @pointerover="portHovered(event, x)"\n              @pointerout="portUnhovered"\n          ></div>\n        </div>\n      </div>\n    </div>\n  </div>\n</button-node>'
window.templates['Blackprint/nodes/default.html'] = '<default-node class="node general" style="transform: translate({{ x }}px, {{ y }}px)">\n  <div class="header" @dragmove="moveNode(event)">\n    <div class="title"><div class="icon"></div><div class="text">{{ title }}</div></div>\n    <div class="description">{{ description }}</div>\n  </div>\n\n  <div class="content">\n    <div class="left-port">\n      <!-- Container for execution port -->\n      <div class="execution in">\n        <div class="port" \n            @pointerdown="createCable(event, x)"\n            @pointerup="cableConnect(x)"\n            @pointerover="portHovered(event, x)"\n            @pointerout="portUnhovered"></div>\n        <div class="name">In</div>\n      </div>\n\n      <!-- Container for input port -->\n      <div class="input">\n        <div class="ports {{ x.type.name }}" sf-repeat-this="x in inputs">\n          <div class="port"\n              @pointerdown="createCable(event, x)"\n              @pointerup="cableConnect(x)"\n              @pointerover="portHovered(event, x)"\n              @pointerout="portUnhovered"\n          ></div>\n          <div class="name">{{ x.name }}</div>\n        </div>\n      </div>\n    </div>\n\n    <div class="right-port">\n      <div class="execution out">\n        <div class="name">Out</div>\n        <div class="port"\n            @pointerdown="createCable(event, x)"\n            @pointerup="cableConnect(x)"\n            @pointerover="portHovered(event, x)"\n            @pointerout="portUnhovered"></div>\n      </div>\n\n      <!-- Container for output port -->\n      <div class="output">\n        <div class="ports {{ x.type.name }}" sf-repeat-this="x in outputs">\n          <div class="name">{{ x.name }}</div>\n          <div class="port"\n              @pointerdown="createCable(event, x)"\n              @pointerup="cableConnect(x)"\n              @pointerover="portHovered(event, x)"\n              @pointerout="portUnhovered"\n          ></div>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <!-- Container for property port -->\n  <div class="property">\n    <div class="ports {{ x.type.name }}" sf-repeat-this="x in properties">\n      <div class="name">{{ x.name }}</div>\n      <div class="port"\n          @pointerdown="createCable(event, x)"\n          @pointerup="cableConnect(x)"\n          @pointerover="portHovered(event, x)"\n          @pointerout="portUnhovered"\n      ></div>\n    </div>\n  </div>\n</default-node>'
window.templates['Blackprint/nodes/input.html'] = '<input-node class="node input" style="transform: translate({{ x }}px, {{ y }}px)">\n  <div class="header" @dragmove="moveNode(event)">\n    <div class="title"><div class="icon"></div><div class="text">{{ title }}</div></div>\n    <div class="description">{{ description }}</div>\n  </div>\n\n  <div class="content">\n    <textarea value="{{ log }}"></textarea>\n\n    <div class="right-port">\n      <!-- Container for output -->\n      <div class="output">\n        <div class="ports {{ x.type.name }}" sf-repeat-this="x in outputs">\n          <div class="name">{{ x.name }}</div>\n          <div class="port"\n              @pointerdown="createCable(event, x)"\n              @pointerup="cableConnect(x)"\n              @pointerover="portHovered(event, x)"\n              @pointerout="portUnhovered"\n          ></div>\n        </div>\n      </div>\n    </div>\n  </div>\n</input-node>'
window.templates['Blackprint/nodes/logger.html'] = '<logger-node class="node function" style="transform: translate({{ x }}px, {{ y }}px)">\n  <div class="header" @dragmove="moveNode(event)">\n    <div class="title"><div class="icon"></div><div class="text">{{ title }}</div></div>\n    <div class="description">{{ description }}</div>\n  </div>\n\n  <div class="content">\n    <textarea value="{{ log }}"></textarea>\n\n    <div class="left-port">\n      <!-- Container for input -->\n      <div class="input">\n        <div class="ports {{ x.type.name }}" sf-repeat-this="x in inputs">\n          <div class="port"\n              @pointerdown="createCable(event, x)"\n              @pointerup="cableConnect(x)"\n              @pointerover="portHovered(event, x)"\n              @pointerout="portUnhovered"\n          ></div>\n          <div class="name">{{ x.name }}</div>\n        </div>\n      </div>\n    </div>\n  </div>\n</logger-node>'