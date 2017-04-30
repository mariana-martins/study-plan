function MindMap() {
    function getTextWidth(txt){
        // Create dummy span
        this.e = document.createElement('span');
        // Set text
        this.e.innerHTML = txt;
        document.body.appendChild(this.e);
        // Get width NOW, since the dummy span is about to be removed from the document
        var w = this.e.offsetWidth;
        // Cleanup
        document.body.removeChild(this.e);
        // All right, we're done
        return w + 10; // + 10, ensure minimun size
    }

    function init() {
        graph = d3.tree()
            .size([360, 120])
            .separation(function (a, b) {
                return (a.parent == b.parent ? 1 : 2) / a.depth;
            });

        root = d3.hierarchy(data);
        root.descendants().forEach(function (element) {
            element.data.closed = true == element.data.closed;

            if (element.data.closed) {
                toggleNode(element);
            }
        });

        gmind = svg.select(".gmind");
        if (gmind.empty()) {
            gmind = svg.append("g").attr("class", "gmind");
        }

        glink = gmind.select(".glink");
        if (glink.empty()) {
            glink = gmind.append("g").attr("class", "glink");
        }

        gnode = gmind.select(".gnode");
        if (gnode.empty()) {
            gnode = gmind.append("g").attr("class", "gnode");
        }

        glink.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");
        gnode.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

        var zoom = d3.zoom().scaleExtent([.7, 2]).translateExtent([
            [-.7 * width, -.7 * height],
            [1.7 * width, 1.7 * height]
        ]).on("zoom", function () {
            var scale = "scale(" + d3.event.transform.k + ")",
                translate = "translate(" + d3.event.transform.x + "," + d3.event.transform.y + ")";
            gmind.attr("transform", translate + scale);
        });
        svg.call(zoom);
    }

    function translateToRadial(x, y) {
        var angle = (x - 90) / 180 * Math.PI,
            n = y;
        return [n * Math.cos(angle), n * Math.sin(angle)]
    }

    function render(positions) {
        graph(root);
        descendants = root.descendants();
        links = root.links();

        descendants.forEach(function (descendant) {
            descendant.y = 120 * descendant.depth;
            descendant.pos = translateToRadial(descendant.x, descendant.y);
        });

        for (var i = 0; i < descendants.length; i++) {
            if (!descendants[i].id) {
                descendants[i].id = baseDescendantId;
                baseDescendantId++;
            }
        }

        for (var i = 0; i < links.length; i++) {
            if (!links[i].id) {
                links[i].id = baseLinkId;
                baseLinkId++;
            }
        }

        var nodeIds = gnode.selectAll(".node").data(descendants, function (node) {
            return node.id;
        });

        var idsEnter = nodeIds.enter();

        var idsExit = nodeIds.exit();

        var nodes = idsEnter.append("g").attr("class", "node")
            .attr("transform", function () {
                return "translate(" + positions[0] + "," + positions[1] + ")";
            }).on("mousedown", function (clickedNode) {
                if (!d3.event.defaultPrevented) {
                    toggleNode(clickedNode);
                    render(clickedNode.prevPos);
                }
            });

        nodes.append("rect")
            // .attr("r", 0)
            .attr("width", 0)
            .attr("height", 0)
            .style("fill", function (node) {
                switch (node.data.type){
                    case "to-know":
                        return "#e79494";
                    case "future":
                        return "#94e7e7";
                    case "improve":
                    default:
                        return "white";
                }
            })
            .style("stroke-width", function(node) {
                switch (node.data.type){
                    case "improve":
                    case "to-know":
                    case "future":
                        return "rgba(20,20,20,0.2)";
                    default:
                        return 0;
                }
            })
            .style("stroke", "grey")
            .style("opacity", 0);

        nodes.append("text")
            .attr("dominant-baseline", "middle")
            .attr("text-anchor", "middle")
            .attr("font-size", 15)
            .text(function (node) {
                return node.data.name;
            })
            .style("fill-opacity", 0);

        var animationEnter = nodes.merge(nodeIds).transition().duration(600).attr("transform", function (node) {
            return "translate(" + node.pos[0] + "," + node.pos[1] + ")"
        });

        var radiusValue = 30;

        animationEnter.select("rect")
            // .attr("r", radiusValue)
            .attr("width", function(node) {
                return getTextWidth(node.data.name);
            })
            .attr("height", radiusValue)
            .attr("x", function(node) {
                return - getTextWidth(node.data.name) / 2;
            })
            .attr("y", -radiusValue/2)
            .style("opacity", 1);
        animationEnter.select("text")
            .style("fill-opacity", 1);

        var animationExit = idsExit.transition().duration(600).attr("transform", function (node) {
            return "translate(" + positions[0] + "," + positions[1] + ")"
        }).remove();
        animationExit.select("circle").style("opacity", 0).attr("r", 0);
        animationExit.select("text").style("fill-opacity", 0);

        var linkTargetIds = glink.selectAll(".link").data(links, function (link) {
                return link.target.id
            }),
            linkTargetEnter = linkTargetIds.enter(),
            linkTargetExit = linkTargetIds.exit();

        linkTargetEnter.append("path")
            .attr("class", "link")
            .attr("fill", "none")
            .attr("stroke", "rgba(20,20,20,0.2)")
            .attr("stroke-width", 1)
            .attr("opacity", 0)
            .attr("d", function (e) {
                var position = {
                    x: positions[0],
                    y: positions[1]
                };
                return createPathD(position, position);
            }).merge(linkTargetIds)
            .transition().duration(600)
            .attr("opacity", 1)
            .attr("d", function (t) {
                var source = {
                        x: t.source.pos[0],
                        y: t.source.pos[1]
                    },
                    target = {
                        x: t.target.pos[0],
                        y: t.target.pos[1]
                    };
                return "M" + source.x + "," + source.y + "L" + target.x + "," + target.y
            });

        linkTargetExit.transition().duration(600)
            .attr("opacity", 0)
            .attr("d", function (e) {
                var source = {
                        x: positions[0],
                        y: positions[1]
                    },
                    target = {
                        x: positions[0],
                        y: positions[1]
                    };
                return "M" + source.x + "," + source.y + "L" + target.x + "," + target.y
            }).remove(), descendants.forEach(function (descendant) {
            descendant.prevPos = [descendant.pos[0], descendant.pos[1]]
        });
    }

    function update() {
    }

    function createPathD(source, target) {
        return "M" + source.x + "," + source.y +
            "C" + (source.x + target.x) / 2 + "," + source.y + " " +
            (source.x + target.x) / 2 + "," + target.y + " " +
            target.x + "," + target.y;
    }

    function toggleNode(element) {
        if (element.children) {
            element._children = element.children;
            element.children = null;
        } else {
            element.children = element._children;
            element._children = null;
        }
        element.data.closed = !element.data.closed;
    }


    var svg, width, height, data, descendants, links, graph, root, gmind, glink, gnode, baseDescendantId = 0,
        baseLinkId = 0;


    this.svg = function (newSvg) {
        if (arguments.length < 1) return svg;
        svg = newSvg;
    };

    this.data = function (newData) {
        if (arguments.length < 1) return data;
        data = newData;
    };

    this.size = function (newWidth, newHeight) {
        if (arguments.length < 2) return [width, height];
        width = newWidth;
        height = newHeight;
    };

    this.getRoot = function () {
        return root;
    };

    this.render = function() {
        init();
        render([0, 0]);
    };
    this.update = update;
}

!function () {
    var mindmapElement = d3.select("#mindmap-svg"),
        width = window.innerWidth, //mindmapElement.attr("width"),
        height = window.innerHeight, //mindmapElement.attr("height"),
        mindmap = new MindMap();

    mindmap.svg(mindmapElement);
    mindmap.size(width, height);

    d3.json("./plan.json", function (error, data) {
        if (error) {
            alert("Error message: can't load data!");
        } else {
            mindmap.data(data);
            mindmap.render();
        }
    })
}()