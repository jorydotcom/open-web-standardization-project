//Constants for the SVG
var width = 900,
    height = 500;

//Set up the color scale
var color = d3.scale.category10();

//Set up the force layout
var force = d3.layout.force()
    .charge(-450)
    .gravity(.05)
    .linkDistance(40)
    .size([width, height]);

//for node stickiness
function dragstart(d) {
  d3.select(this).classed("fixed", d.fixed = true);
}

function releaseNode(d) {
  d3.select(this).classed("fixed", d.fixed = false);
}

var drag = force.drag()
    .on("dragstart", dragstart)

//Append an SVG to the body of the html page. Assign this SVG as an object to svg
var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

//load the data
d3.json("graph.json", function(error, graph) {
  force
      .nodes(graph.nodes)
      .links(graph.links)
      .start();
  
  //append divs with class 'node_data' and id 'node:name' for all nodes in graph.json
  d3.select("body").selectAll("div")
  		.data(graph.nodes)
  		.enter()
      .append("div")
  		.attr("class", "node_data")
  	    .attr("style", "display:none")
  	    .attr("id", function(d) { return d.name; });

  d3.selectAll("body div.node_data").insert("h2")
  		.text(function(d) { return d.name; });

  d3.selectAll("body div.node_data").insert("p")
  		.html(function(d) { return d.data; });
  	    
  //Append a GD footer because wtf D3 is hard
  d3.selectAll("body").append("footer").html('<img src="bobsmall.png"><p>A research project by <a href="http://twitter.com/jorydotcom">jorydotcom</a> @ <a href="http://bocoup.com/datavis">Bocoup</a> </br>Join the discussion on <a href="https://github.com/jorydotcom/open-web-standardization-project">GitHub</a></br>Content current as of April 20, 2015</p>');
  
  //Create all the line svgs but without locations yet
    var link = svg.selectAll(".link")
        .data(graph.links)
        .enter().append("line")
        .attr("class", "link")
        .style("stroke-width", function(d) { return Math.sqrt(d.value); });

  //Do the same with the circles for the nodes  
    var node = svg.selectAll(".node")
        .data(graph.nodes)
        .enter().append("g")
        .attr("class", "node")
        //.on('click', connectedNodes) //For highlighting related nodes
        .call(drag);

        //onclick, display or hide appropriate div, highlight related nodes
        node.on('click', connectedNodes)
        node.on('dblclick', releaseNode)

    node.append("circle")
        .attr("r", 8)
        .style("fill", function(d) { return color(d.group); })

    node.append("text")
        .attr("dx", 10)
        .attr("dy", ".35em")
        .text(function(d) { return d.name });

  //Now we are giving the SVGs co-ordinates - the force layout is generating the co-ordinates which this code is using to update the attributes of the SVG elements
    force.on("tick", function() {
      link.attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });

      d3.selectAll("circle").attr("cx", function (d) {
          return d.x;
      })
          .attr("cy", function (d) {
          return d.y;
      });

      d3.selectAll("text").attr("x", function (d) {
          return d.x;
      })
          .attr("y", function (d) {
          return d.y;
      });
      node.each(collide(1.0)); //Added for collision prevention
    });

  //Toggle stores whether the highlighting is on
  var toggle = 0;

  //Create an array logging what is connected to what
  var linkedByIndex = {};

  for (i = 0; i < graph.nodes.length; i++) {
      linkedByIndex[i + "," + i] = 1;
  };

  graph.links.forEach(function (d) {
      linkedByIndex[d.source.index + "," + d.target.index] = 1;
  });

  //This function looks up whether a pair are neighbours
  function neighboring(a, b) {
      return linkedByIndex[a.index + "," + b.index];
  }
  function connectedNodes() {
      if (toggle == 0) {
          //Reduce the opacity of all but the neighbouring nodes
          d = d3.select(this).node().__data__;
          node.style("opacity", function (o) {
              return neighboring(d, o) | neighboring(o, d) ? 1 : 0.1;
          });
          link.style("opacity", function (o) {
              return d.index==o.source.index | d.index==o.target.index ? 1 : 0.1;
          });
          //Reduce the op
          toggle = 1;
      } else {
          //Put them back to opacity=1
          node.style("opacity", 1);
          link.style("opacity", 1);
          toggle = 0;
      }           
        divs = document.getElementsByClassName("node_data");
          for (i = 0; i < divs.length; i++){
            if (divs[i].style.display == 'block' && divs[i].id != d.name)
              divs[i].style.display = 'none';
          };
          element = document.getElementById(d.name);
          if (element.style.display == 'none')
            element.style.display = 'block';
          else if (element.style.display == 'block')
            element.style.display = 'none';
       }
  

  // Resolves collisions between d and all other circles.
  var padding = 1, // separation between circles
      radius=10;

  function collide(alpha) {
    var quadtree = d3.geom.quadtree(graph.nodes);
    return function(d) {
      var rb = 2*radius + padding,
          nx1 = d.x - rb,
          nx2 = d.x + rb,
          ny1 = d.y - rb,
          ny2 = d.y + rb;
      
      quadtree.visit(function(quad, x1, y1, x2, y2) {
        if (quad.point && (quad.point !== d)) {
          var x = d.x - quad.point.x,
              y = d.y - quad.point.y,
              l = Math.sqrt(x * x + y * y);
            if (l < rb) {
            l = (l - rb) / l * alpha;
            d.x -= x *= l;
            d.y -= y *= l;
            quad.point.x += x;
            quad.point.y += y;
          }
        }
        return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
      });
    };
  }
});