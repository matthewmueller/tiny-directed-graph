/**
 * Module Dependencies
 */

var keys = Object.keys;

/**
 * Traversal methods
 */

var methods = {
  up: 'backrefs',
  down: 'edges'
};

/**
 * Export `Graph`
 */

module.exports = Graph;

/**
 * Initialize `Graph`
 */

function Graph() {
  if (!(this instanceof Graph)) return new Graph();
  this.nodes = {};
}

/**
 * put
 */

Graph.prototype.put = function(key, value) {
  value = undefined === value ? NaN : value;

  // update nodes, don't remove links
  if (this.nodes[key]) {
    this.nodes[key].value = value;
    return this;
  }

  this.nodes[key] = {
    value: value,
    backrefs: [],
    edges: []
  };

  return this;
};

/**
 * link
 */

Graph.prototype.link = function(from, to) {
  if (!this.nodes[from]) this.put(from);
  if (!this.nodes[to]) this.put(to);

  if ('string' == typeof to) {
    this.nodes[from].edges.push(to);
    this.nodes[to].backrefs.push(from);
  } else {
    this.nodes[from].edges = this.nodes[from].edges.concat(to);
    for (var i = 0, node; node = to[i]; i++) {
      this.nodes[to].backrefs.push(from);
    }
  }

  return this;
};

/**
 * unlink
 */

Graph.prototype.unlink = function(from, edges) {
  var nodes = this.nodes;

  var node = nodes[from];
  if (!node) return this;

  if (arguments.length == 1) {
    edges = node.edges;
    for (var i = 0, edge; edge = edges[i]; i++) {
      nodes[edge].backrefs.splice(from, 1);
    }
    node.edges = []
  } else if (typeof edges == 'string') {
    nodes[edges].backrefs.splice(from, 1)
    node.edges.splice(edges, 1);

  } else {
    for (var i = 0, edge; edge = edges[i]; i++) {
      nodes[edge].backrefs.splice(from, 1);
      node.edges.splice(edge, 1);
    }
  }

  // eliminate backrefs on `from` node
  var backrefs = node.backrefs;
  for (var i = 0, backref; backref = backrefs[i]; i++) {
    nodes[backref].edges.splice(from, 1);
  }
  node.backrefs = [];

  return this;
};

/**
 * del
 */

Graph.prototype.del = function(key) {
  this.unlink(key)
  delete this.nodes[key];
  return this;
};

/**
 * get
 */

Graph.prototype.get = function(key) {
  return this.nodes[key] ? this.nodes[key].value : NaN;
};

/**
 * exists
 */

Graph.prototype.exists = function(key) {
  return !!this.nodes[key];
};

/**
 * Setup the traversal methods
 */

keys(methods).forEach(function(action) {
  var attrs = methods[action];

  Graph.prototype[action] = function(key, depth, fn, ctx, visiting, visited) {
    if ('function' == typeof depth) {
      ctx = fn;
      fn = depth;
      depth = Infinity;
    }

    // initialize
    visiting = visiting || {};
    visited = visited || {};

    if (!depth-- || visited[key]) return this;
    else if (visiting[key]) throw new Error(key + ' already visited. graph is cyclical.');
    visiting[key] = true;

    var node = this.nodes[key];
    if (!node) throw new Error(key + ' doesn\'t exist.');

    var arr = node[attrs];
    var parents = {};
    var node;

    if (!arr.length) {
      visited[key] = true;
      delete visiting[key];
      return this;
    }

    for (var i = 0, item; item = arr[i]; i++) {
      if (visited[item] || visiting[item]) continue;
      node = this.nodes[item];
      parents[item] = node.value;
    }

    fn.call(ctx, parents, key);

    for (var i = 0, item; item = arr[i]; i++) {
      this[action](item, depth, fn, ctx, visiting, visited);
    }

    visited[key] = true;
    delete visiting[key];

    return this;
  }

  Graph.prototype['sorted_' + action] = function(key, depth) {
    depth = depth || Infinity

    var next_level = [key]
    var nodes = this.nodes
    var levels = []
    var below = {}
    var d = 0
    while (d++ < depth && next_level.length) {
      var children = {}
      next_level = next_level.map(function (key) {
        var node = nodes[key]
        if (!node) throw new Error(key + ' doesn\'t exist.')
        var edges = node[attrs]

        for (var i = 0, child; child = edges[i]; i++) {
          node = nodes[child]
          children[child] = node.value
          below[child] = d
        }

        return edges
      }).reduce(function (a, b) { return a.concat(b) })
      levels.push(next_level)
    }

    var sorted = []
    for (var key in below) {
      sorted.push({ key: key, depth: below[key] })
    }

    sorted.sort(function (a, b) { return a.depth - b.depth })
    return sorted
  }
})

/**
 * toString
 */

Graph.prototype.toString = function() {
  return JSON.stringify(this.nodes, true, 2)
};
