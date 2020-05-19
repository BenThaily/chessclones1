(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.LichessAnalyse = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
function r(r,t){r.prototype=Object.create(t.prototype),r.prototype.constructor=r,r.__proto__=t}var t,n=function(){function r(){}var t=r.prototype;return t.unwrap=function(r,t){var n=this._chain((function(t){return exports.Result.ok(r?r(t):t)}),(function(r){return t?exports.Result.ok(t(r)):exports.Result.err(r)}));if(n.isErr)throw n.error;return n.value},t.map=function(r,t){return this._chain((function(t){return exports.Result.ok(r(t))}),(function(r){return exports.Result.err(t?t(r):r)}))},t.chain=function(r,t){return this._chain(r,t||function(r){return exports.Result.err(r)})},r}(),e=function(t){function n(r){var n;return(n=t.call(this)||this).value=r,n.isOk=!0,n.isErr=!1,n}return r(n,t),n.prototype._chain=function(r,t){return r(this.value)},n}(n),u=function(t){function n(r){var n;return(n=t.call(this)||this).error=r,n.isOk=!1,n.isErr=!0,n}return r(n,t),n.prototype._chain=function(r,t){return t(this.error)},n}(n);(t=exports.Result||(exports.Result={})).ok=function(r){return new e(r)},t.err=function(r){return new u(r)},t.all=function(r){if(Array.isArray(r)){for(var n=[],e=0;e<r.length;e++){var u=r[e];if(u.isErr)return u;n.push(u.value)}return t.ok(n)}for(var o={},i=Object.keys(r),s=0;s<i.length;s++){var c=r[i[s]];if(c.isErr)return c;o[i[s]]=c.value}return t.ok(o)};


},{}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("./util");
function anim(mutation, state) {
    return state.animation.enabled ? animate(mutation, state) : render(mutation, state);
}
exports.anim = anim;
function render(mutation, state) {
    const result = mutation(state);
    state.dom.redraw();
    return result;
}
exports.render = render;
function makePiece(key, piece) {
    return {
        key: key,
        pos: util.key2pos(key),
        piece: piece
    };
}
function closer(piece, pieces) {
    return pieces.sort((p1, p2) => {
        return util.distanceSq(piece.pos, p1.pos) - util.distanceSq(piece.pos, p2.pos);
    })[0];
}
function computePlan(prevPieces, current) {
    const anims = {}, animedOrigs = [], fadings = {}, missings = [], news = [], prePieces = {};
    let curP, preP, i, vector;
    for (i in prevPieces) {
        prePieces[i] = makePiece(i, prevPieces[i]);
    }
    for (const key of util.allKeys) {
        curP = current.pieces[key];
        preP = prePieces[key];
        if (curP) {
            if (preP) {
                if (!util.samePiece(curP, preP.piece)) {
                    missings.push(preP);
                    news.push(makePiece(key, curP));
                }
            }
            else
                news.push(makePiece(key, curP));
        }
        else if (preP)
            missings.push(preP);
    }
    news.forEach(newP => {
        preP = closer(newP, missings.filter(p => util.samePiece(newP.piece, p.piece)));
        if (preP) {
            vector = [preP.pos[0] - newP.pos[0], preP.pos[1] - newP.pos[1]];
            anims[newP.key] = vector.concat(vector);
            animedOrigs.push(preP.key);
        }
    });
    missings.forEach(p => {
        if (!util.containsX(animedOrigs, p.key))
            fadings[p.key] = p.piece;
    });
    return {
        anims: anims,
        fadings: fadings
    };
}
function step(state, now) {
    const cur = state.animation.current;
    if (cur === undefined) {
        if (!state.dom.destroyed)
            state.dom.redrawNow();
        return;
    }
    const rest = 1 - (now - cur.start) * cur.frequency;
    if (rest <= 0) {
        state.animation.current = undefined;
        state.dom.redrawNow();
    }
    else {
        const ease = easing(rest);
        for (let i in cur.plan.anims) {
            const cfg = cur.plan.anims[i];
            cfg[2] = cfg[0] * ease;
            cfg[3] = cfg[1] * ease;
        }
        state.dom.redrawNow(true);
        requestAnimationFrame((now = performance.now()) => step(state, now));
    }
}
function animate(mutation, state) {
    const prevPieces = Object.assign({}, state.pieces);
    const result = mutation(state);
    const plan = computePlan(prevPieces, state);
    if (!isObjectEmpty(plan.anims) || !isObjectEmpty(plan.fadings)) {
        const alreadyRunning = state.animation.current && state.animation.current.start;
        state.animation.current = {
            start: performance.now(),
            frequency: 1 / state.animation.duration,
            plan: plan
        };
        if (!alreadyRunning)
            step(state, performance.now());
    }
    else {
        state.dom.redraw();
    }
    return result;
}
function isObjectEmpty(o) {
    for (let _ in o)
        return false;
    return true;
}
function easing(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

},{"./util":18}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const board = require("./board");
const fen_1 = require("./fen");
const config_1 = require("./config");
const anim_1 = require("./anim");
const drag_1 = require("./drag");
const explosion_1 = require("./explosion");
function start(state, redrawAll) {
    function toggleOrientation() {
        board.toggleOrientation(state);
        redrawAll();
    }
    ;
    return {
        set(config) {
            if (config.orientation && config.orientation !== state.orientation)
                toggleOrientation();
            (config.fen ? anim_1.anim : anim_1.render)(state => config_1.configure(state, config), state);
        },
        state,
        getFen: () => fen_1.write(state.pieces),
        toggleOrientation,
        setPieces(pieces) {
            anim_1.anim(state => board.setPieces(state, pieces), state);
        },
        selectSquare(key, force) {
            if (key)
                anim_1.anim(state => board.selectSquare(state, key, force), state);
            else if (state.selected) {
                board.unselect(state);
                state.dom.redraw();
            }
        },
        move(orig, dest) {
            anim_1.anim(state => board.baseMove(state, orig, dest), state);
        },
        newPiece(piece, key) {
            anim_1.anim(state => board.baseNewPiece(state, piece, key), state);
        },
        playPremove() {
            if (state.premovable.current) {
                if (anim_1.anim(board.playPremove, state))
                    return true;
                state.dom.redraw();
            }
            return false;
        },
        playPredrop(validate) {
            if (state.predroppable.current) {
                const result = board.playPredrop(state, validate);
                state.dom.redraw();
                return result;
            }
            return false;
        },
        cancelPremove() {
            anim_1.render(board.unsetPremove, state);
        },
        cancelPredrop() {
            anim_1.render(board.unsetPredrop, state);
        },
        cancelMove() {
            anim_1.render(state => { board.cancelMove(state); drag_1.cancel(state); }, state);
        },
        stop() {
            anim_1.render(state => { board.stop(state); drag_1.cancel(state); }, state);
        },
        explode(keys) {
            explosion_1.default(state, keys);
        },
        setAutoShapes(shapes) {
            anim_1.render(state => state.drawable.autoShapes = shapes, state);
        },
        setShapes(shapes) {
            anim_1.render(state => state.drawable.shapes = shapes, state);
        },
        getKeyAtDomPos(pos) {
            return board.getKeyAtDomPos(pos, board.whitePov(state), state.dom.bounds());
        },
        redrawAll,
        dragNewPiece(piece, event, force) {
            drag_1.dragNewPiece(state, piece, event, force);
        },
        destroy() {
            board.stop(state);
            state.dom.unbind && state.dom.unbind();
            state.dom.destroyed = true;
        }
    };
}
exports.start = start;

},{"./anim":2,"./board":4,"./config":6,"./drag":7,"./explosion":11,"./fen":12}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const premove_1 = require("./premove");
function callUserFunction(f, ...args) {
    if (f)
        setTimeout(() => f(...args), 1);
}
exports.callUserFunction = callUserFunction;
function toggleOrientation(state) {
    state.orientation = util_1.opposite(state.orientation);
    state.animation.current =
        state.draggable.current =
            state.selected = undefined;
}
exports.toggleOrientation = toggleOrientation;
function reset(state) {
    state.lastMove = undefined;
    unselect(state);
    unsetPremove(state);
    unsetPredrop(state);
}
exports.reset = reset;
function setPieces(state, pieces) {
    for (let key in pieces) {
        const piece = pieces[key];
        if (piece)
            state.pieces[key] = piece;
        else
            delete state.pieces[key];
    }
}
exports.setPieces = setPieces;
function setCheck(state, color) {
    state.check = undefined;
    if (color === true)
        color = state.turnColor;
    if (color)
        for (let k in state.pieces) {
            if (state.pieces[k].role === 'king' && state.pieces[k].color === color) {
                state.check = k;
            }
        }
}
exports.setCheck = setCheck;
function setPremove(state, orig, dest, meta) {
    unsetPredrop(state);
    state.premovable.current = [orig, dest];
    callUserFunction(state.premovable.events.set, orig, dest, meta);
}
function unsetPremove(state) {
    if (state.premovable.current) {
        state.premovable.current = undefined;
        callUserFunction(state.premovable.events.unset);
    }
}
exports.unsetPremove = unsetPremove;
function setPredrop(state, role, key) {
    unsetPremove(state);
    state.predroppable.current = { role, key };
    callUserFunction(state.predroppable.events.set, role, key);
}
function unsetPredrop(state) {
    const pd = state.predroppable;
    if (pd.current) {
        pd.current = undefined;
        callUserFunction(pd.events.unset);
    }
}
exports.unsetPredrop = unsetPredrop;
function tryAutoCastle(state, orig, dest) {
    if (!state.autoCastle)
        return false;
    const king = state.pieces[orig];
    if (!king || king.role !== 'king')
        return false;
    const origPos = util_1.key2pos(orig);
    if (origPos[0] !== 5)
        return false;
    if (origPos[1] !== 1 && origPos[1] !== 8)
        return false;
    const destPos = util_1.key2pos(dest);
    let oldRookPos, newRookPos, newKingPos;
    if (destPos[0] === 7 || destPos[0] === 8) {
        oldRookPos = util_1.pos2key([8, origPos[1]]);
        newRookPos = util_1.pos2key([6, origPos[1]]);
        newKingPos = util_1.pos2key([7, origPos[1]]);
    }
    else if (destPos[0] === 3 || destPos[0] === 1) {
        oldRookPos = util_1.pos2key([1, origPos[1]]);
        newRookPos = util_1.pos2key([4, origPos[1]]);
        newKingPos = util_1.pos2key([3, origPos[1]]);
    }
    else
        return false;
    const rook = state.pieces[oldRookPos];
    if (!rook || rook.role !== 'rook')
        return false;
    delete state.pieces[orig];
    delete state.pieces[oldRookPos];
    state.pieces[newKingPos] = king;
    state.pieces[newRookPos] = rook;
    return true;
}
function baseMove(state, orig, dest) {
    const origPiece = state.pieces[orig], destPiece = state.pieces[dest];
    if (orig === dest || !origPiece)
        return false;
    const captured = (destPiece && destPiece.color !== origPiece.color) ? destPiece : undefined;
    if (dest == state.selected)
        unselect(state);
    callUserFunction(state.events.move, orig, dest, captured);
    if (!tryAutoCastle(state, orig, dest)) {
        state.pieces[dest] = origPiece;
        delete state.pieces[orig];
    }
    state.lastMove = [orig, dest];
    state.check = undefined;
    callUserFunction(state.events.change);
    return captured || true;
}
exports.baseMove = baseMove;
function baseNewPiece(state, piece, key, force) {
    if (state.pieces[key]) {
        if (force)
            delete state.pieces[key];
        else
            return false;
    }
    callUserFunction(state.events.dropNewPiece, piece, key);
    state.pieces[key] = piece;
    state.lastMove = [key];
    state.check = undefined;
    callUserFunction(state.events.change);
    state.movable.dests = undefined;
    state.turnColor = util_1.opposite(state.turnColor);
    return true;
}
exports.baseNewPiece = baseNewPiece;
function baseUserMove(state, orig, dest) {
    const result = baseMove(state, orig, dest);
    if (result) {
        state.movable.dests = undefined;
        state.turnColor = util_1.opposite(state.turnColor);
        state.animation.current = undefined;
    }
    return result;
}
function userMove(state, orig, dest) {
    if (canMove(state, orig, dest)) {
        const result = baseUserMove(state, orig, dest);
        if (result) {
            const holdTime = state.hold.stop();
            unselect(state);
            const metadata = {
                premove: false,
                ctrlKey: state.stats.ctrlKey,
                holdTime
            };
            if (result !== true)
                metadata.captured = result;
            callUserFunction(state.movable.events.after, orig, dest, metadata);
            return true;
        }
    }
    else if (canPremove(state, orig, dest)) {
        setPremove(state, orig, dest, {
            ctrlKey: state.stats.ctrlKey
        });
        unselect(state);
        return true;
    }
    unselect(state);
    return false;
}
exports.userMove = userMove;
function dropNewPiece(state, orig, dest, force) {
    if (canDrop(state, orig, dest) || force) {
        const piece = state.pieces[orig];
        delete state.pieces[orig];
        baseNewPiece(state, piece, dest, force);
        callUserFunction(state.movable.events.afterNewPiece, piece.role, dest, {
            predrop: false
        });
    }
    else if (canPredrop(state, orig, dest)) {
        setPredrop(state, state.pieces[orig].role, dest);
    }
    else {
        unsetPremove(state);
        unsetPredrop(state);
    }
    delete state.pieces[orig];
    unselect(state);
}
exports.dropNewPiece = dropNewPiece;
function selectSquare(state, key, force) {
    callUserFunction(state.events.select, key);
    if (state.selected) {
        if (state.selected === key && !state.draggable.enabled) {
            unselect(state);
            state.hold.cancel();
            return;
        }
        else if ((state.selectable.enabled || force) && state.selected !== key) {
            if (userMove(state, state.selected, key)) {
                state.stats.dragged = false;
                return;
            }
        }
    }
    if (isMovable(state, key) || isPremovable(state, key)) {
        setSelected(state, key);
        state.hold.start();
    }
}
exports.selectSquare = selectSquare;
function setSelected(state, key) {
    state.selected = key;
    if (isPremovable(state, key)) {
        state.premovable.dests = premove_1.default(state.pieces, key, state.premovable.castle);
    }
    else
        state.premovable.dests = undefined;
}
exports.setSelected = setSelected;
function unselect(state) {
    state.selected = undefined;
    state.premovable.dests = undefined;
    state.hold.cancel();
}
exports.unselect = unselect;
function isMovable(state, orig) {
    const piece = state.pieces[orig];
    return !!piece && (state.movable.color === 'both' || (state.movable.color === piece.color &&
        state.turnColor === piece.color));
}
function canMove(state, orig, dest) {
    return orig !== dest && isMovable(state, orig) && (state.movable.free || (!!state.movable.dests && util_1.containsX(state.movable.dests[orig], dest)));
}
exports.canMove = canMove;
function canDrop(state, orig, dest) {
    const piece = state.pieces[orig];
    return !!piece && dest && (orig === dest || !state.pieces[dest]) && (state.movable.color === 'both' || (state.movable.color === piece.color &&
        state.turnColor === piece.color));
}
function isPremovable(state, orig) {
    const piece = state.pieces[orig];
    return !!piece && state.premovable.enabled &&
        state.movable.color === piece.color &&
        state.turnColor !== piece.color;
}
function canPremove(state, orig, dest) {
    return orig !== dest &&
        isPremovable(state, orig) &&
        util_1.containsX(premove_1.default(state.pieces, orig, state.premovable.castle), dest);
}
function canPredrop(state, orig, dest) {
    const piece = state.pieces[orig];
    const destPiece = state.pieces[dest];
    return !!piece && dest &&
        (!destPiece || destPiece.color !== state.movable.color) &&
        state.predroppable.enabled &&
        (piece.role !== 'pawn' || (dest[1] !== '1' && dest[1] !== '8')) &&
        state.movable.color === piece.color &&
        state.turnColor !== piece.color;
}
function isDraggable(state, orig) {
    const piece = state.pieces[orig];
    return !!piece && state.draggable.enabled && (state.movable.color === 'both' || (state.movable.color === piece.color && (state.turnColor === piece.color || state.premovable.enabled)));
}
exports.isDraggable = isDraggable;
function playPremove(state) {
    const move = state.premovable.current;
    if (!move)
        return false;
    const orig = move[0], dest = move[1];
    let success = false;
    if (canMove(state, orig, dest)) {
        const result = baseUserMove(state, orig, dest);
        if (result) {
            const metadata = { premove: true };
            if (result !== true)
                metadata.captured = result;
            callUserFunction(state.movable.events.after, orig, dest, metadata);
            success = true;
        }
    }
    unsetPremove(state);
    return success;
}
exports.playPremove = playPremove;
function playPredrop(state, validate) {
    let drop = state.predroppable.current, success = false;
    if (!drop)
        return false;
    if (validate(drop)) {
        const piece = {
            role: drop.role,
            color: state.movable.color
        };
        if (baseNewPiece(state, piece, drop.key)) {
            callUserFunction(state.movable.events.afterNewPiece, drop.role, drop.key, {
                predrop: true
            });
            success = true;
        }
    }
    unsetPredrop(state);
    return success;
}
exports.playPredrop = playPredrop;
function cancelMove(state) {
    unsetPremove(state);
    unsetPredrop(state);
    unselect(state);
}
exports.cancelMove = cancelMove;
function stop(state) {
    state.movable.color =
        state.movable.dests =
            state.animation.current = undefined;
    cancelMove(state);
}
exports.stop = stop;
function getKeyAtDomPos(pos, asWhite, bounds) {
    let file = Math.ceil(8 * ((pos[0] - bounds.left) / bounds.width));
    if (!asWhite)
        file = 9 - file;
    let rank = Math.ceil(8 - (8 * ((pos[1] - bounds.top) / bounds.height)));
    if (!asWhite)
        rank = 9 - rank;
    return (file > 0 && file < 9 && rank > 0 && rank < 9) ? util_1.pos2key([file, rank]) : undefined;
}
exports.getKeyAtDomPos = getKeyAtDomPos;
function whitePov(s) {
    return s.orientation === 'white';
}
exports.whitePov = whitePov;

},{"./premove":13,"./util":18}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("./api");
const config_1 = require("./config");
const state_1 = require("./state");
const wrap_1 = require("./wrap");
const events = require("./events");
const render_1 = require("./render");
const svg = require("./svg");
const util = require("./util");
function Chessground(element, config) {
    const state = state_1.defaults();
    config_1.configure(state, config || {});
    function redrawAll() {
        let prevUnbind = state.dom && state.dom.unbind;
        const relative = state.viewOnly && !state.drawable.visible, elements = wrap_1.default(element, state, relative), bounds = util.memo(() => elements.board.getBoundingClientRect()), redrawNow = (skipSvg) => {
            render_1.default(state);
            if (!skipSvg && elements.svg)
                svg.renderSvg(state, elements.svg);
        };
        state.dom = {
            elements,
            bounds,
            redraw: debounceRedraw(redrawNow),
            redrawNow,
            unbind: prevUnbind,
            relative
        };
        state.drawable.prevSvgHash = '';
        redrawNow(false);
        events.bindBoard(state);
        if (!prevUnbind)
            state.dom.unbind = events.bindDocument(state, redrawAll);
        state.events.insert && state.events.insert(elements);
    }
    redrawAll();
    return api_1.start(state, redrawAll);
}
exports.Chessground = Chessground;
;
function debounceRedraw(redrawNow) {
    let redrawing = false;
    return () => {
        if (redrawing)
            return;
        redrawing = true;
        requestAnimationFrame(() => {
            redrawNow();
            redrawing = false;
        });
    };
}

},{"./api":3,"./config":6,"./events":10,"./render":14,"./state":15,"./svg":16,"./util":18,"./wrap":19}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const board_1 = require("./board");
const fen_1 = require("./fen");
function configure(state, config) {
    if (config.movable && config.movable.dests)
        state.movable.dests = undefined;
    merge(state, config);
    if (config.fen) {
        state.pieces = fen_1.read(config.fen);
        state.drawable.shapes = [];
    }
    if (config.hasOwnProperty('check'))
        board_1.setCheck(state, config.check || false);
    if (config.hasOwnProperty('lastMove') && !config.lastMove)
        state.lastMove = undefined;
    else if (config.lastMove)
        state.lastMove = config.lastMove;
    if (state.selected)
        board_1.setSelected(state, state.selected);
    if (!state.animation.duration || state.animation.duration < 100)
        state.animation.enabled = false;
    if (!state.movable.rookCastle && state.movable.dests) {
        const rank = state.movable.color === 'white' ? 1 : 8, kingStartPos = 'e' + rank, dests = state.movable.dests[kingStartPos], king = state.pieces[kingStartPos];
        if (!dests || !king || king.role !== 'king')
            return;
        state.movable.dests[kingStartPos] = dests.filter(d => !((d === 'a' + rank) && dests.indexOf('c' + rank) !== -1) &&
            !((d === 'h' + rank) && dests.indexOf('g' + rank) !== -1));
    }
}
exports.configure = configure;
;
function merge(base, extend) {
    for (let key in extend) {
        if (isObject(base[key]) && isObject(extend[key]))
            merge(base[key], extend[key]);
        else
            base[key] = extend[key];
    }
}
function isObject(o) {
    return typeof o === 'object';
}

},{"./board":4,"./fen":12}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const board = require("./board");
const util = require("./util");
const draw_1 = require("./draw");
const anim_1 = require("./anim");
function start(s, e) {
    if (e.button !== undefined && e.button !== 0)
        return;
    if (e.touches && e.touches.length > 1)
        return;
    const bounds = s.dom.bounds(), position = util.eventPosition(e), orig = board.getKeyAtDomPos(position, board.whitePov(s), bounds);
    if (!orig)
        return;
    const piece = s.pieces[orig];
    const previouslySelected = s.selected;
    if (!previouslySelected && s.drawable.enabled && (s.drawable.eraseOnClick || (!piece || piece.color !== s.turnColor)))
        draw_1.clear(s);
    if (e.cancelable !== false &&
        (!e.touches || !s.movable.color || piece || previouslySelected || pieceCloseTo(s, position)))
        e.preventDefault();
    const hadPremove = !!s.premovable.current;
    const hadPredrop = !!s.predroppable.current;
    s.stats.ctrlKey = e.ctrlKey;
    if (s.selected && board.canMove(s, s.selected, orig)) {
        anim_1.anim(state => board.selectSquare(state, orig), s);
    }
    else {
        board.selectSquare(s, orig);
    }
    const stillSelected = s.selected === orig;
    const element = pieceElementByKey(s, orig);
    if (piece && element && stillSelected && board.isDraggable(s, orig)) {
        const squareBounds = computeSquareBounds(orig, board.whitePov(s), bounds);
        s.draggable.current = {
            orig,
            origPos: util.key2pos(orig),
            piece,
            rel: position,
            epos: position,
            pos: [0, 0],
            dec: s.draggable.centerPiece ? [
                position[0] - (squareBounds.left + squareBounds.width / 2),
                position[1] - (squareBounds.top + squareBounds.height / 2)
            ] : [0, 0],
            started: s.draggable.autoDistance && s.stats.dragged,
            element,
            previouslySelected,
            originTarget: e.target
        };
        element.cgDragging = true;
        element.classList.add('dragging');
        const ghost = s.dom.elements.ghost;
        if (ghost) {
            ghost.className = `ghost ${piece.color} ${piece.role}`;
            util.translateAbs(ghost, util.posToTranslateAbs(bounds)(util.key2pos(orig), board.whitePov(s)));
            util.setVisible(ghost, true);
        }
        processDrag(s);
    }
    else {
        if (hadPremove)
            board.unsetPremove(s);
        if (hadPredrop)
            board.unsetPredrop(s);
    }
    s.dom.redraw();
}
exports.start = start;
function pieceCloseTo(s, pos) {
    const asWhite = board.whitePov(s), bounds = s.dom.bounds(), radiusSq = Math.pow(bounds.width / 8, 2);
    for (let key in s.pieces) {
        const squareBounds = computeSquareBounds(key, asWhite, bounds), center = [
            squareBounds.left + squareBounds.width / 2,
            squareBounds.top + squareBounds.height / 2
        ];
        if (util.distanceSq(center, pos) <= radiusSq)
            return true;
    }
    return false;
}
exports.pieceCloseTo = pieceCloseTo;
function dragNewPiece(s, piece, e, force) {
    const key = 'a0';
    s.pieces[key] = piece;
    s.dom.redraw();
    const position = util.eventPosition(e), asWhite = board.whitePov(s), bounds = s.dom.bounds(), squareBounds = computeSquareBounds(key, asWhite, bounds);
    const rel = [
        (asWhite ? 0 : 7) * squareBounds.width + bounds.left,
        (asWhite ? 8 : -1) * squareBounds.height + bounds.top
    ];
    s.draggable.current = {
        orig: key,
        origPos: util.key2pos(key),
        piece,
        rel,
        epos: position,
        pos: [position[0] - rel[0], position[1] - rel[1]],
        dec: [-squareBounds.width / 2, -squareBounds.height / 2],
        started: true,
        element: () => pieceElementByKey(s, key),
        originTarget: e.target,
        newPiece: true,
        force: !!force
    };
    processDrag(s);
}
exports.dragNewPiece = dragNewPiece;
function processDrag(s) {
    requestAnimationFrame(() => {
        const cur = s.draggable.current;
        if (!cur)
            return;
        if (s.animation.current && s.animation.current.plan.anims[cur.orig])
            s.animation.current = undefined;
        const origPiece = s.pieces[cur.orig];
        if (!origPiece || !util.samePiece(origPiece, cur.piece))
            cancel(s);
        else {
            if (!cur.started && util.distanceSq(cur.epos, cur.rel) >= Math.pow(s.draggable.distance, 2))
                cur.started = true;
            if (cur.started) {
                if (typeof cur.element === 'function') {
                    const found = cur.element();
                    if (!found)
                        return;
                    found.cgDragging = true;
                    found.classList.add('dragging');
                    cur.element = found;
                }
                cur.pos = [
                    cur.epos[0] - cur.rel[0],
                    cur.epos[1] - cur.rel[1]
                ];
                const translation = util.posToTranslateAbs(s.dom.bounds())(cur.origPos, board.whitePov(s));
                translation[0] += cur.pos[0] + cur.dec[0];
                translation[1] += cur.pos[1] + cur.dec[1];
                util.translateAbs(cur.element, translation);
            }
        }
        processDrag(s);
    });
}
function move(s, e) {
    if (s.draggable.current && (!e.touches || e.touches.length < 2)) {
        s.draggable.current.epos = util.eventPosition(e);
    }
}
exports.move = move;
function end(s, e) {
    const cur = s.draggable.current;
    if (!cur)
        return;
    if (e.type === 'touchend' && e.cancelable !== false)
        e.preventDefault();
    if (e.type === 'touchend' && cur && cur.originTarget !== e.target && !cur.newPiece) {
        s.draggable.current = undefined;
        return;
    }
    board.unsetPremove(s);
    board.unsetPredrop(s);
    const eventPos = util.eventPosition(e) || cur.epos;
    const dest = board.getKeyAtDomPos(eventPos, board.whitePov(s), s.dom.bounds());
    if (dest && cur.started && cur.orig !== dest) {
        if (cur.newPiece)
            board.dropNewPiece(s, cur.orig, dest, cur.force);
        else {
            s.stats.ctrlKey = e.ctrlKey;
            if (board.userMove(s, cur.orig, dest))
                s.stats.dragged = true;
        }
    }
    else if (cur.newPiece) {
        delete s.pieces[cur.orig];
    }
    else if (s.draggable.deleteOnDropOff && !dest) {
        delete s.pieces[cur.orig];
        board.callUserFunction(s.events.change);
    }
    if (cur && cur.orig === cur.previouslySelected && (cur.orig === dest || !dest))
        board.unselect(s);
    else if (!s.selectable.enabled)
        board.unselect(s);
    removeDragElements(s);
    s.draggable.current = undefined;
    s.dom.redraw();
}
exports.end = end;
function cancel(s) {
    const cur = s.draggable.current;
    if (cur) {
        if (cur.newPiece)
            delete s.pieces[cur.orig];
        s.draggable.current = undefined;
        board.unselect(s);
        removeDragElements(s);
        s.dom.redraw();
    }
}
exports.cancel = cancel;
function removeDragElements(s) {
    const e = s.dom.elements;
    if (e.ghost)
        util.setVisible(e.ghost, false);
}
function computeSquareBounds(key, asWhite, bounds) {
    const pos = util.key2pos(key);
    if (!asWhite) {
        pos[0] = 9 - pos[0];
        pos[1] = 9 - pos[1];
    }
    return {
        left: bounds.left + bounds.width * (pos[0] - 1) / 8,
        top: bounds.top + bounds.height * (8 - pos[1]) / 8,
        width: bounds.width / 8,
        height: bounds.height / 8
    };
}
function pieceElementByKey(s, key) {
    let el = s.dom.elements.board.firstChild;
    while (el) {
        if (el.cgKey === key && el.tagName === 'PIECE')
            return el;
        el = el.nextSibling;
    }
    return undefined;
}

},{"./anim":2,"./board":4,"./draw":8,"./util":18}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const board_1 = require("./board");
const util_1 = require("./util");
const brushes = ['green', 'red', 'blue', 'yellow'];
function start(state, e) {
    if (e.touches && e.touches.length > 1)
        return;
    e.stopPropagation();
    e.preventDefault();
    e.ctrlKey ? board_1.unselect(state) : board_1.cancelMove(state);
    const pos = util_1.eventPosition(e), orig = board_1.getKeyAtDomPos(pos, board_1.whitePov(state), state.dom.bounds());
    if (!orig)
        return;
    state.drawable.current = {
        orig,
        pos,
        brush: eventBrush(e)
    };
    processDraw(state);
}
exports.start = start;
function processDraw(state) {
    requestAnimationFrame(() => {
        const cur = state.drawable.current;
        if (cur) {
            const mouseSq = board_1.getKeyAtDomPos(cur.pos, board_1.whitePov(state), state.dom.bounds());
            if (mouseSq !== cur.mouseSq) {
                cur.mouseSq = mouseSq;
                cur.dest = mouseSq !== cur.orig ? mouseSq : undefined;
                state.dom.redrawNow();
            }
            processDraw(state);
        }
    });
}
exports.processDraw = processDraw;
function move(state, e) {
    if (state.drawable.current)
        state.drawable.current.pos = util_1.eventPosition(e);
}
exports.move = move;
function end(state) {
    const cur = state.drawable.current;
    if (cur) {
        if (cur.mouseSq)
            addShape(state.drawable, cur);
        cancel(state);
    }
}
exports.end = end;
function cancel(state) {
    if (state.drawable.current) {
        state.drawable.current = undefined;
        state.dom.redraw();
    }
}
exports.cancel = cancel;
function clear(state) {
    if (state.drawable.shapes.length) {
        state.drawable.shapes = [];
        state.dom.redraw();
        onChange(state.drawable);
    }
}
exports.clear = clear;
function eventBrush(e) {
    return brushes[((e.shiftKey || e.ctrlKey) && util_1.isRightButton(e) ? 1 : 0) + (e.altKey ? 2 : 0)];
}
function addShape(drawable, cur) {
    const sameShape = (s) => s.orig === cur.orig && s.dest === cur.dest;
    const similar = drawable.shapes.filter(sameShape)[0];
    if (similar)
        drawable.shapes = drawable.shapes.filter(s => !sameShape(s));
    if (!similar || similar.brush !== cur.brush)
        drawable.shapes.push(cur);
    onChange(drawable);
}
function onChange(drawable) {
    if (drawable.onChange)
        drawable.onChange(drawable.shapes);
}

},{"./board":4,"./util":18}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const board = require("./board");
const util = require("./util");
const drag_1 = require("./drag");
function setDropMode(s, piece) {
    s.dropmode = {
        active: true,
        piece
    };
    drag_1.cancel(s);
}
exports.setDropMode = setDropMode;
function cancelDropMode(s) {
    s.dropmode = {
        active: false
    };
}
exports.cancelDropMode = cancelDropMode;
function drop(s, e) {
    if (!s.dropmode.active)
        return;
    board.unsetPremove(s);
    board.unsetPredrop(s);
    const piece = s.dropmode.piece;
    if (piece) {
        s.pieces.a0 = piece;
        const position = util.eventPosition(e);
        const dest = position && board.getKeyAtDomPos(position, board.whitePov(s), s.dom.bounds());
        if (dest)
            board.dropNewPiece(s, 'a0', dest);
    }
    s.dom.redraw();
}
exports.drop = drop;

},{"./board":4,"./drag":7,"./util":18}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const drag = require("./drag");
const draw = require("./draw");
const drop_1 = require("./drop");
const util_1 = require("./util");
function bindBoard(s) {
    if (s.viewOnly)
        return;
    const boardEl = s.dom.elements.board, onStart = startDragOrDraw(s);
    boardEl.addEventListener('touchstart', onStart, { passive: false });
    boardEl.addEventListener('mousedown', onStart, { passive: false });
    if (s.disableContextMenu || s.drawable.enabled) {
        boardEl.addEventListener('contextmenu', e => e.preventDefault());
    }
}
exports.bindBoard = bindBoard;
function bindDocument(s, redrawAll) {
    const unbinds = [];
    if (!s.dom.relative && s.resizable) {
        const onResize = () => {
            s.dom.bounds.clear();
            requestAnimationFrame(redrawAll);
        };
        unbinds.push(unbindable(document.body, 'chessground.resize', onResize));
    }
    if (!s.viewOnly) {
        const onmove = dragOrDraw(s, drag.move, draw.move);
        const onend = dragOrDraw(s, drag.end, draw.end);
        ['touchmove', 'mousemove'].forEach(ev => unbinds.push(unbindable(document, ev, onmove)));
        ['touchend', 'mouseup'].forEach(ev => unbinds.push(unbindable(document, ev, onend)));
        const onScroll = () => s.dom.bounds.clear();
        unbinds.push(unbindable(window, 'scroll', onScroll, { passive: true }));
        unbinds.push(unbindable(window, 'resize', onScroll, { passive: true }));
    }
    return () => unbinds.forEach(f => f());
}
exports.bindDocument = bindDocument;
function unbindable(el, eventName, callback, options) {
    el.addEventListener(eventName, callback, options);
    return () => el.removeEventListener(eventName, callback);
}
function startDragOrDraw(s) {
    return e => {
        if (s.draggable.current)
            drag.cancel(s);
        else if (s.drawable.current)
            draw.cancel(s);
        else if (e.shiftKey || util_1.isRightButton(e)) {
            if (s.drawable.enabled)
                draw.start(s, e);
        }
        else if (!s.viewOnly) {
            if (s.dropmode.active)
                drop_1.drop(s, e);
            else
                drag.start(s, e);
        }
    };
}
function dragOrDraw(s, withDrag, withDraw) {
    return e => {
        if (e.shiftKey || util_1.isRightButton(e)) {
            if (s.drawable.enabled)
                withDraw(s, e);
        }
        else if (!s.viewOnly)
            withDrag(s, e);
    };
}

},{"./drag":7,"./draw":8,"./drop":9,"./util":18}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function explosion(state, keys) {
    state.exploding = { stage: 1, keys };
    state.dom.redraw();
    setTimeout(() => {
        setStage(state, 2);
        setTimeout(() => setStage(state, undefined), 120);
    }, 120);
}
exports.default = explosion;
function setStage(state, stage) {
    if (state.exploding) {
        if (stage)
            state.exploding.stage = stage;
        else
            state.exploding = undefined;
        state.dom.redraw();
    }
}

},{}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const cg = require("./types");
exports.initial = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
const roles = { p: 'pawn', r: 'rook', n: 'knight', b: 'bishop', q: 'queen', k: 'king' };
const letters = { pawn: 'p', rook: 'r', knight: 'n', bishop: 'b', queen: 'q', king: 'k' };
function read(fen) {
    if (fen === 'start')
        fen = exports.initial;
    const pieces = {};
    let row = 8, col = 0;
    for (const c of fen) {
        switch (c) {
            case ' ': return pieces;
            case '/':
                --row;
                if (row === 0)
                    return pieces;
                col = 0;
                break;
            case '~':
                const piece = pieces[util_1.pos2key([col, row])];
                if (piece)
                    piece.promoted = true;
                break;
            default:
                const nb = c.charCodeAt(0);
                if (nb < 57)
                    col += nb - 48;
                else {
                    ++col;
                    const role = c.toLowerCase();
                    pieces[util_1.pos2key([col, row])] = {
                        role: roles[role],
                        color: (c === role ? 'black' : 'white')
                    };
                }
        }
    }
    return pieces;
}
exports.read = read;
function write(pieces) {
    return util_1.invRanks.map(y => cg.ranks.map(x => {
        const piece = pieces[util_1.pos2key([x, y])];
        if (piece) {
            const letter = letters[piece.role];
            return piece.color === 'white' ? letter.toUpperCase() : letter;
        }
        else
            return '1';
    }).join('')).join('/').replace(/1{2,}/g, s => s.length.toString());
}
exports.write = write;

},{"./types":17,"./util":18}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("./util");
function diff(a, b) {
    return Math.abs(a - b);
}
function pawn(color) {
    return (x1, y1, x2, y2) => diff(x1, x2) < 2 && (color === 'white' ? (y2 === y1 + 1 || (y1 <= 2 && y2 === (y1 + 2) && x1 === x2)) : (y2 === y1 - 1 || (y1 >= 7 && y2 === (y1 - 2) && x1 === x2)));
}
const knight = (x1, y1, x2, y2) => {
    const xd = diff(x1, x2);
    const yd = diff(y1, y2);
    return (xd === 1 && yd === 2) || (xd === 2 && yd === 1);
};
const bishop = (x1, y1, x2, y2) => {
    return diff(x1, x2) === diff(y1, y2);
};
const rook = (x1, y1, x2, y2) => {
    return x1 === x2 || y1 === y2;
};
const queen = (x1, y1, x2, y2) => {
    return bishop(x1, y1, x2, y2) || rook(x1, y1, x2, y2);
};
function king(color, rookFiles, canCastle) {
    return (x1, y1, x2, y2) => (diff(x1, x2) < 2 && diff(y1, y2) < 2) || (canCastle && y1 === y2 && y1 === (color === 'white' ? 1 : 8) && ((x1 === 5 && ((util.containsX(rookFiles, 1) && x2 === 3) || (util.containsX(rookFiles, 8) && x2 === 7))) ||
        util.containsX(rookFiles, x2)));
}
function rookFilesOf(pieces, color) {
    const backrank = color == 'white' ? '1' : '8';
    return Object.keys(pieces).filter(key => {
        const piece = pieces[key];
        return key[1] === backrank && piece && piece.color === color && piece.role === 'rook';
    }).map((key) => util.key2pos(key)[0]);
}
const allPos = util.allKeys.map(util.key2pos);
function premove(pieces, key, canCastle) {
    const piece = pieces[key], pos = util.key2pos(key), r = piece.role, mobility = r === 'pawn' ? pawn(piece.color) : (r === 'knight' ? knight : (r === 'bishop' ? bishop : (r === 'rook' ? rook : (r === 'queen' ? queen : king(piece.color, rookFilesOf(pieces, piece.color), canCastle)))));
    return allPos.filter(pos2 => (pos[0] !== pos2[0] || pos[1] !== pos2[1]) && mobility(pos[0], pos[1], pos2[0], pos2[1])).map(util.pos2key);
}
exports.default = premove;
;

},{"./util":18}],14:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const board_1 = require("./board");
const util = require("./util");
function render(s) {
    const asWhite = board_1.whitePov(s), posToTranslate = s.dom.relative ? util.posToTranslateRel : util.posToTranslateAbs(s.dom.bounds()), translate = s.dom.relative ? util.translateRel : util.translateAbs, boardEl = s.dom.elements.board, pieces = s.pieces, curAnim = s.animation.current, anims = curAnim ? curAnim.plan.anims : {}, fadings = curAnim ? curAnim.plan.fadings : {}, curDrag = s.draggable.current, squares = computeSquareClasses(s), samePieces = {}, sameSquares = {}, movedPieces = {}, movedSquares = {}, piecesKeys = Object.keys(pieces);
    let k, p, el, pieceAtKey, elPieceName, anim, fading, pMvdset, pMvd, sMvdset, sMvd;
    el = boardEl.firstChild;
    while (el) {
        k = el.cgKey;
        if (isPieceNode(el)) {
            pieceAtKey = pieces[k];
            anim = anims[k];
            fading = fadings[k];
            elPieceName = el.cgPiece;
            if (el.cgDragging && (!curDrag || curDrag.orig !== k)) {
                el.classList.remove('dragging');
                translate(el, posToTranslate(util_1.key2pos(k), asWhite));
                el.cgDragging = false;
            }
            if (!fading && el.cgFading) {
                el.cgFading = false;
                el.classList.remove('fading');
            }
            if (pieceAtKey) {
                if (anim && el.cgAnimating && elPieceName === pieceNameOf(pieceAtKey)) {
                    const pos = util_1.key2pos(k);
                    pos[0] += anim[2];
                    pos[1] += anim[3];
                    el.classList.add('anim');
                    translate(el, posToTranslate(pos, asWhite));
                }
                else if (el.cgAnimating) {
                    el.cgAnimating = false;
                    el.classList.remove('anim');
                    translate(el, posToTranslate(util_1.key2pos(k), asWhite));
                    if (s.addPieceZIndex)
                        el.style.zIndex = posZIndex(util_1.key2pos(k), asWhite);
                }
                if (elPieceName === pieceNameOf(pieceAtKey) && (!fading || !el.cgFading)) {
                    samePieces[k] = true;
                }
                else {
                    if (fading && elPieceName === pieceNameOf(fading)) {
                        el.classList.add('fading');
                        el.cgFading = true;
                    }
                    else {
                        if (movedPieces[elPieceName])
                            movedPieces[elPieceName].push(el);
                        else
                            movedPieces[elPieceName] = [el];
                    }
                }
            }
            else {
                if (movedPieces[elPieceName])
                    movedPieces[elPieceName].push(el);
                else
                    movedPieces[elPieceName] = [el];
            }
        }
        else if (isSquareNode(el)) {
            const cn = el.className;
            if (squares[k] === cn)
                sameSquares[k] = true;
            else if (movedSquares[cn])
                movedSquares[cn].push(el);
            else
                movedSquares[cn] = [el];
        }
        el = el.nextSibling;
    }
    for (const sk in squares) {
        if (!sameSquares[sk]) {
            sMvdset = movedSquares[squares[sk]];
            sMvd = sMvdset && sMvdset.pop();
            const translation = posToTranslate(util_1.key2pos(sk), asWhite);
            if (sMvd) {
                sMvd.cgKey = sk;
                translate(sMvd, translation);
            }
            else {
                const squareNode = util_1.createEl('square', squares[sk]);
                squareNode.cgKey = sk;
                translate(squareNode, translation);
                boardEl.insertBefore(squareNode, boardEl.firstChild);
            }
        }
    }
    for (const j in piecesKeys) {
        k = piecesKeys[j];
        p = pieces[k];
        anim = anims[k];
        if (!samePieces[k]) {
            pMvdset = movedPieces[pieceNameOf(p)];
            pMvd = pMvdset && pMvdset.pop();
            if (pMvd) {
                pMvd.cgKey = k;
                if (pMvd.cgFading) {
                    pMvd.classList.remove('fading');
                    pMvd.cgFading = false;
                }
                const pos = util_1.key2pos(k);
                if (s.addPieceZIndex)
                    pMvd.style.zIndex = posZIndex(pos, asWhite);
                if (anim) {
                    pMvd.cgAnimating = true;
                    pMvd.classList.add('anim');
                    pos[0] += anim[2];
                    pos[1] += anim[3];
                }
                translate(pMvd, posToTranslate(pos, asWhite));
            }
            else {
                const pieceName = pieceNameOf(p), pieceNode = util_1.createEl('piece', pieceName), pos = util_1.key2pos(k);
                pieceNode.cgPiece = pieceName;
                pieceNode.cgKey = k;
                if (anim) {
                    pieceNode.cgAnimating = true;
                    pos[0] += anim[2];
                    pos[1] += anim[3];
                }
                translate(pieceNode, posToTranslate(pos, asWhite));
                if (s.addPieceZIndex)
                    pieceNode.style.zIndex = posZIndex(pos, asWhite);
                boardEl.appendChild(pieceNode);
            }
        }
    }
    for (const i in movedPieces)
        removeNodes(s, movedPieces[i]);
    for (const i in movedSquares)
        removeNodes(s, movedSquares[i]);
}
exports.default = render;
function isPieceNode(el) {
    return el.tagName === 'PIECE';
}
function isSquareNode(el) {
    return el.tagName === 'SQUARE';
}
function removeNodes(s, nodes) {
    for (const i in nodes)
        s.dom.elements.board.removeChild(nodes[i]);
}
function posZIndex(pos, asWhite) {
    let z = 2 + (pos[1] - 1) * 8 + (8 - pos[0]);
    if (asWhite)
        z = 67 - z;
    return z + '';
}
function pieceNameOf(piece) {
    return `${piece.color} ${piece.role}`;
}
function computeSquareClasses(s) {
    const squares = {};
    let i, k;
    if (s.lastMove && s.highlight.lastMove)
        for (i in s.lastMove) {
            addSquare(squares, s.lastMove[i], 'last-move');
        }
    if (s.check && s.highlight.check)
        addSquare(squares, s.check, 'check');
    if (s.selected) {
        addSquare(squares, s.selected, 'selected');
        if (s.movable.showDests) {
            const dests = s.movable.dests && s.movable.dests[s.selected];
            if (dests)
                for (i in dests) {
                    k = dests[i];
                    addSquare(squares, k, 'move-dest' + (s.pieces[k] ? ' oc' : ''));
                }
            const pDests = s.premovable.dests;
            if (pDests)
                for (i in pDests) {
                    k = pDests[i];
                    addSquare(squares, k, 'premove-dest' + (s.pieces[k] ? ' oc' : ''));
                }
        }
    }
    const premove = s.premovable.current;
    if (premove)
        for (i in premove)
            addSquare(squares, premove[i], 'current-premove');
    else if (s.predroppable.current)
        addSquare(squares, s.predroppable.current.key, 'current-premove');
    const o = s.exploding;
    if (o)
        for (i in o.keys)
            addSquare(squares, o.keys[i], 'exploding' + o.stage);
    return squares;
}
function addSquare(squares, key, klass) {
    if (squares[key])
        squares[key] += ' ' + klass;
    else
        squares[key] = klass;
}

},{"./board":4,"./util":18}],15:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fen = require("./fen");
const util_1 = require("./util");
function defaults() {
    return {
        pieces: fen.read(fen.initial),
        orientation: 'white',
        turnColor: 'white',
        coordinates: true,
        autoCastle: true,
        viewOnly: false,
        disableContextMenu: false,
        resizable: true,
        addPieceZIndex: false,
        pieceKey: false,
        highlight: {
            lastMove: true,
            check: true
        },
        animation: {
            enabled: true,
            duration: 200
        },
        movable: {
            free: true,
            color: 'both',
            showDests: true,
            events: {},
            rookCastle: true
        },
        premovable: {
            enabled: true,
            showDests: true,
            castle: true,
            events: {}
        },
        predroppable: {
            enabled: false,
            events: {}
        },
        draggable: {
            enabled: true,
            distance: 3,
            autoDistance: true,
            centerPiece: true,
            showGhost: true,
            deleteOnDropOff: false
        },
        dropmode: {
            active: false
        },
        selectable: {
            enabled: true
        },
        stats: {
            dragged: !('ontouchstart' in window)
        },
        events: {},
        drawable: {
            enabled: true,
            visible: true,
            eraseOnClick: true,
            shapes: [],
            autoShapes: [],
            brushes: {
                green: { key: 'g', color: '#15781B', opacity: 1, lineWidth: 10 },
                red: { key: 'r', color: '#882020', opacity: 1, lineWidth: 10 },
                blue: { key: 'b', color: '#003088', opacity: 1, lineWidth: 10 },
                yellow: { key: 'y', color: '#e68f00', opacity: 1, lineWidth: 10 },
                paleBlue: { key: 'pb', color: '#003088', opacity: 0.4, lineWidth: 15 },
                paleGreen: { key: 'pg', color: '#15781B', opacity: 0.4, lineWidth: 15 },
                paleRed: { key: 'pr', color: '#882020', opacity: 0.4, lineWidth: 15 },
                paleGrey: { key: 'pgr', color: '#4a4a4a', opacity: 0.35, lineWidth: 15 }
            },
            pieces: {
                baseUrl: 'https://lichess1.org/assets/piece/cburnett/'
            },
            prevSvgHash: ''
        },
        hold: util_1.timer()
    };
}
exports.defaults = defaults;

},{"./fen":12,"./util":18}],16:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
function createElement(tagName) {
    return document.createElementNS('http://www.w3.org/2000/svg', tagName);
}
exports.createElement = createElement;
function renderSvg(state, root) {
    const d = state.drawable, curD = d.current, cur = curD && curD.mouseSq ? curD : undefined, arrowDests = {};
    d.shapes.concat(d.autoShapes).concat(cur ? [cur] : []).forEach(s => {
        if (s.dest)
            arrowDests[s.dest] = (arrowDests[s.dest] || 0) + 1;
    });
    const shapes = d.shapes.concat(d.autoShapes).map((s) => {
        return {
            shape: s,
            current: false,
            hash: shapeHash(s, arrowDests, false)
        };
    });
    if (cur)
        shapes.push({
            shape: cur,
            current: true,
            hash: shapeHash(cur, arrowDests, true)
        });
    const fullHash = shapes.map(sc => sc.hash).join('');
    if (fullHash === state.drawable.prevSvgHash)
        return;
    state.drawable.prevSvgHash = fullHash;
    const defsEl = root.firstChild;
    syncDefs(d, shapes, defsEl);
    syncShapes(state, shapes, d.brushes, arrowDests, root, defsEl);
}
exports.renderSvg = renderSvg;
function syncDefs(d, shapes, defsEl) {
    const brushes = {};
    let brush;
    shapes.forEach(s => {
        if (s.shape.dest) {
            brush = d.brushes[s.shape.brush];
            if (s.shape.modifiers)
                brush = makeCustomBrush(brush, s.shape.modifiers);
            brushes[brush.key] = brush;
        }
    });
    const keysInDom = {};
    let el = defsEl.firstChild;
    while (el) {
        keysInDom[el.getAttribute('cgKey')] = true;
        el = el.nextSibling;
    }
    for (let key in brushes) {
        if (!keysInDom[key])
            defsEl.appendChild(renderMarker(brushes[key]));
    }
}
function syncShapes(state, shapes, brushes, arrowDests, root, defsEl) {
    const bounds = state.dom.bounds(), hashesInDom = {}, toRemove = [];
    shapes.forEach(sc => { hashesInDom[sc.hash] = false; });
    let el = defsEl.nextSibling, elHash;
    while (el) {
        elHash = el.getAttribute('cgHash');
        if (hashesInDom.hasOwnProperty(elHash))
            hashesInDom[elHash] = true;
        else
            toRemove.push(el);
        el = el.nextSibling;
    }
    toRemove.forEach(el => root.removeChild(el));
    shapes.forEach(sc => {
        if (!hashesInDom[sc.hash])
            root.appendChild(renderShape(state, sc, brushes, arrowDests, bounds));
    });
}
function shapeHash({ orig, dest, brush, piece, modifiers }, arrowDests, current) {
    return [current, orig, dest, brush, dest && arrowDests[dest] > 1,
        piece && pieceHash(piece),
        modifiers && modifiersHash(modifiers)
    ].filter(x => x).join('');
}
function pieceHash(piece) {
    return [piece.color, piece.role, piece.scale].filter(x => x).join('');
}
function modifiersHash(m) {
    return '' + (m.lineWidth || '');
}
function renderShape(state, { shape, current, hash }, brushes, arrowDests, bounds) {
    let el;
    if (shape.piece)
        el = renderPiece(state.drawable.pieces.baseUrl, orient(util_1.key2pos(shape.orig), state.orientation), shape.piece, bounds);
    else {
        const orig = orient(util_1.key2pos(shape.orig), state.orientation);
        if (shape.orig && shape.dest) {
            let brush = brushes[shape.brush];
            if (shape.modifiers)
                brush = makeCustomBrush(brush, shape.modifiers);
            el = renderArrow(brush, orig, orient(util_1.key2pos(shape.dest), state.orientation), current, arrowDests[shape.dest] > 1, bounds);
        }
        else
            el = renderCircle(brushes[shape.brush], orig, current, bounds);
    }
    el.setAttribute('cgHash', hash);
    return el;
}
function renderCircle(brush, pos, current, bounds) {
    const o = pos2px(pos, bounds), widths = circleWidth(bounds), radius = (bounds.width + bounds.height) / 32;
    return setAttributes(createElement('circle'), {
        stroke: brush.color,
        'stroke-width': widths[current ? 0 : 1],
        fill: 'none',
        opacity: opacity(brush, current),
        cx: o[0],
        cy: o[1],
        r: radius - widths[1] / 2
    });
}
function renderArrow(brush, orig, dest, current, shorten, bounds) {
    const m = arrowMargin(bounds, shorten && !current), a = pos2px(orig, bounds), b = pos2px(dest, bounds), dx = b[0] - a[0], dy = b[1] - a[1], angle = Math.atan2(dy, dx), xo = Math.cos(angle) * m, yo = Math.sin(angle) * m;
    return setAttributes(createElement('line'), {
        stroke: brush.color,
        'stroke-width': lineWidth(brush, current, bounds),
        'stroke-linecap': 'round',
        'marker-end': 'url(#arrowhead-' + brush.key + ')',
        opacity: opacity(brush, current),
        x1: a[0],
        y1: a[1],
        x2: b[0] - xo,
        y2: b[1] - yo
    });
}
function renderPiece(baseUrl, pos, piece, bounds) {
    const o = pos2px(pos, bounds), size = bounds.width / 8 * (piece.scale || 1), name = piece.color[0] + (piece.role === 'knight' ? 'n' : piece.role[0]).toUpperCase();
    return setAttributes(createElement('image'), {
        className: `${piece.role} ${piece.color}`,
        x: o[0] - size / 2,
        y: o[1] - size / 2,
        width: size,
        height: size,
        href: baseUrl + name + '.svg'
    });
}
function renderMarker(brush) {
    const marker = setAttributes(createElement('marker'), {
        id: 'arrowhead-' + brush.key,
        orient: 'auto',
        markerWidth: 4,
        markerHeight: 8,
        refX: 2.05,
        refY: 2.01
    });
    marker.appendChild(setAttributes(createElement('path'), {
        d: 'M0,0 V4 L3,2 Z',
        fill: brush.color
    }));
    marker.setAttribute('cgKey', brush.key);
    return marker;
}
function setAttributes(el, attrs) {
    for (let key in attrs)
        el.setAttribute(key, attrs[key]);
    return el;
}
function orient(pos, color) {
    return color === 'white' ? pos : [9 - pos[0], 9 - pos[1]];
}
function makeCustomBrush(base, modifiers) {
    const brush = {
        color: base.color,
        opacity: Math.round(base.opacity * 10) / 10,
        lineWidth: Math.round(modifiers.lineWidth || base.lineWidth)
    };
    brush.key = [base.key, modifiers.lineWidth].filter(x => x).join('');
    return brush;
}
function circleWidth(bounds) {
    const base = bounds.width / 512;
    return [3 * base, 4 * base];
}
function lineWidth(brush, current, bounds) {
    return (brush.lineWidth || 10) * (current ? 0.85 : 1) / 512 * bounds.width;
}
function opacity(brush, current) {
    return (brush.opacity || 1) * (current ? 0.9 : 1);
}
function arrowMargin(bounds, shorten) {
    return (shorten ? 20 : 10) / 512 * bounds.width;
}
function pos2px(pos, bounds) {
    return [(pos[0] - 0.5) * bounds.width / 8, (8.5 - pos[1]) * bounds.height / 8];
}

},{"./util":18}],17:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
exports.ranks = [1, 2, 3, 4, 5, 6, 7, 8];

},{}],18:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cg = require("./types");
exports.colors = ['white', 'black'];
exports.invRanks = [8, 7, 6, 5, 4, 3, 2, 1];
exports.allKeys = Array.prototype.concat(...cg.files.map(c => cg.ranks.map(r => c + r)));
exports.pos2key = (pos) => exports.allKeys[8 * pos[0] + pos[1] - 9];
exports.key2pos = (k) => [k.charCodeAt(0) - 96, k.charCodeAt(1) - 48];
function memo(f) {
    let v;
    const ret = () => {
        if (v === undefined)
            v = f();
        return v;
    };
    ret.clear = () => { v = undefined; };
    return ret;
}
exports.memo = memo;
exports.timer = () => {
    let startAt;
    return {
        start() { startAt = performance.now(); },
        cancel() { startAt = undefined; },
        stop() {
            if (!startAt)
                return 0;
            const time = performance.now() - startAt;
            startAt = undefined;
            return time;
        }
    };
};
exports.opposite = (c) => c === 'white' ? 'black' : 'white';
function containsX(xs, x) {
    return xs !== undefined && xs.indexOf(x) !== -1;
}
exports.containsX = containsX;
exports.distanceSq = (pos1, pos2) => {
    return Math.pow(pos1[0] - pos2[0], 2) + Math.pow(pos1[1] - pos2[1], 2);
};
exports.samePiece = (p1, p2) => p1.role === p2.role && p1.color === p2.color;
const posToTranslateBase = (pos, asWhite, xFactor, yFactor) => [
    (asWhite ? pos[0] - 1 : 8 - pos[0]) * xFactor,
    (asWhite ? 8 - pos[1] : pos[1] - 1) * yFactor
];
exports.posToTranslateAbs = (bounds) => {
    const xFactor = bounds.width / 8, yFactor = bounds.height / 8;
    return (pos, asWhite) => posToTranslateBase(pos, asWhite, xFactor, yFactor);
};
exports.posToTranslateRel = (pos, asWhite) => posToTranslateBase(pos, asWhite, 100, 100);
exports.translateAbs = (el, pos) => {
    el.style.transform = `translate(${pos[0]}px,${pos[1]}px)`;
};
exports.translateRel = (el, percents) => {
    el.style.transform = `translate(${percents[0]}%,${percents[1]}%)`;
};
exports.setVisible = (el, v) => {
    el.style.visibility = v ? 'visible' : 'hidden';
};
exports.eventPosition = e => {
    if (e.clientX || e.clientX === 0)
        return [e.clientX, e.clientY];
    if (e.touches && e.targetTouches[0])
        return [e.targetTouches[0].clientX, e.targetTouches[0].clientY];
    return undefined;
};
exports.isRightButton = (e) => e.buttons === 2 || e.button === 2;
exports.createEl = (tagName, className) => {
    const el = document.createElement(tagName);
    if (className)
        el.className = className;
    return el;
};

},{"./types":17}],19:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const types_1 = require("./types");
const svg_1 = require("./svg");
function wrap(element, s, relative) {
    element.innerHTML = '';
    element.classList.add('cg-wrap');
    util_1.colors.forEach(c => element.classList.toggle('orientation-' + c, s.orientation === c));
    element.classList.toggle('manipulable', !s.viewOnly);
    const helper = util_1.createEl('cg-helper');
    element.appendChild(helper);
    const container = util_1.createEl('cg-container');
    helper.appendChild(container);
    const board = util_1.createEl('cg-board');
    container.appendChild(board);
    let svg;
    if (s.drawable.visible && !relative) {
        svg = svg_1.createElement('svg');
        svg.appendChild(svg_1.createElement('defs'));
        container.appendChild(svg);
    }
    if (s.coordinates) {
        const orientClass = s.orientation === 'black' ? ' black' : '';
        container.appendChild(renderCoords(types_1.ranks, 'ranks' + orientClass));
        container.appendChild(renderCoords(types_1.files, 'files' + orientClass));
    }
    let ghost;
    if (s.draggable.showGhost && !relative) {
        ghost = util_1.createEl('piece', 'ghost');
        util_1.setVisible(ghost, false);
        container.appendChild(ghost);
    }
    return {
        board,
        container,
        ghost,
        svg
    };
}
exports.default = wrap;
function renderCoords(elems, className) {
    const el = util_1.createEl('coords', className);
    let f;
    for (let i in elems) {
        f = util_1.createEl('coord');
        f.textContent = elems[i];
        el.appendChild(f);
    }
    return el;
}

},{"./svg":16,"./types":17,"./util":18}],20:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const squareSet_1 = require("./squareSet");
function computeRange(square, deltas, stepper) {
    let range = squareSet_1.SquareSet.empty();
    for (const delta of deltas) {
        for (let sq = square + delta; 0 <= sq && sq < 64 && util_1.squareDist(sq, sq - delta) <= 2; sq += delta) {
            range = range.with(sq);
            if (stepper)
                break;
        }
    }
    return range;
}
function computeTable(deltas, stepper) {
    const table = [];
    for (let square = 0; square < 64; square++) {
        table[square] = computeRange(square, deltas, stepper);
    }
    return table;
}
const KING_ATTACKS = computeTable([-9, -8, -7, -1, 1, 7, 8, 9], true);
const KNIGHT_ATTACKS = computeTable([-17, -15, -10, -6, 6, 10, 15, 17], true);
const PAWN_ATTACKS = {
    white: computeTable([7, 9], true),
    black: computeTable([-7, -9], true),
};
function kingAttacks(square) {
    return KING_ATTACKS[square];
}
exports.kingAttacks = kingAttacks;
function knightAttacks(square) {
    return KNIGHT_ATTACKS[square];
}
exports.knightAttacks = knightAttacks;
function pawnAttacks(color, square) {
    return PAWN_ATTACKS[color][square];
}
exports.pawnAttacks = pawnAttacks;
const FILE_RANGE = computeTable([-8, 8], false);
const RANK_RANGE = computeTable([-1, 1], false);
const DIAG_RANGE = computeTable([-9, 9], false);
const ANTI_DIAG_RANGE = computeTable([-7, 7], false);
function hyperbola(bit, range, occupied) {
    let forward = occupied.intersect(range);
    let reverse = forward.bswap64(); // Assumes no more than 1 bit per rank
    forward = forward.minus64(bit);
    reverse = reverse.minus64(bit.bswap64());
    forward = forward.xor(reverse.bswap64());
    return forward.intersect(range);
}
function fileAttacks(square, occupied) {
    return hyperbola(squareSet_1.SquareSet.fromSquare(square), FILE_RANGE[square], occupied);
}
function rankAttacks(square, occupied) {
    const range = RANK_RANGE[square];
    let forward = occupied.intersect(range);
    let reverse = forward.rbit64();
    forward = forward.minus64(squareSet_1.SquareSet.fromSquare(square));
    reverse = reverse.minus64(squareSet_1.SquareSet.fromSquare(63 - square));
    forward = forward.xor(reverse.rbit64());
    return forward.intersect(range);
}
function diagAttacks(square, occupied) {
    return hyperbola(squareSet_1.SquareSet.fromSquare(square), DIAG_RANGE[square], occupied);
}
function antiDiagAttacks(square, occupied) {
    return hyperbola(squareSet_1.SquareSet.fromSquare(square), ANTI_DIAG_RANGE[square], occupied);
}
function bishopAttacks(square, occupied) {
    const bit = squareSet_1.SquareSet.fromSquare(square);
    return hyperbola(bit, DIAG_RANGE[square], occupied).xor(hyperbola(bit, ANTI_DIAG_RANGE[square], occupied));
}
exports.bishopAttacks = bishopAttacks;
function rookAttacks(square, occupied) {
    return fileAttacks(square, occupied).xor(rankAttacks(square, occupied));
}
exports.rookAttacks = rookAttacks;
function queenAttacks(square, occupied) {
    return bishopAttacks(square, occupied).xor(rookAttacks(square, occupied));
}
exports.queenAttacks = queenAttacks;
function attacks(piece, square, occupied) {
    switch (piece.role) {
        case 'pawn': return pawnAttacks(piece.color, square);
        case 'knight': return knightAttacks(square);
        case 'bishop': return bishopAttacks(square, occupied);
        case 'rook': return rookAttacks(square, occupied);
        case 'queen': return queenAttacks(square, occupied);
        case 'king': return kingAttacks(square);
    }
}
exports.attacks = attacks;
function rayTables() {
    const ray = [];
    const between = [];
    const zero = squareSet_1.SquareSet.empty();
    for (let a = 0; a < 64; a++) {
        ray[a] = [];
        between[a] = [];
        for (let b = 0; b < 64; b++) {
            ray[a][b] = zero;
            between[a][b] = zero;
        }
        for (const b of DIAG_RANGE[a]) {
            ray[a][b] = DIAG_RANGE[a].with(a);
            between[a][b] = diagAttacks(a, squareSet_1.SquareSet.fromSquare(b)).intersect(diagAttacks(b, squareSet_1.SquareSet.fromSquare(a)));
        }
        for (const b of ANTI_DIAG_RANGE[a]) {
            ray[a][b] = ANTI_DIAG_RANGE[a].with(a);
            between[a][b] = antiDiagAttacks(a, squareSet_1.SquareSet.fromSquare(b)).intersect(antiDiagAttacks(b, squareSet_1.SquareSet.fromSquare(a)));
        }
        for (const b of FILE_RANGE[a]) {
            ray[a][b] = FILE_RANGE[a].with(a);
            between[a][b] = fileAttacks(a, squareSet_1.SquareSet.fromSquare(b)).intersect(fileAttacks(b, squareSet_1.SquareSet.fromSquare(a)));
        }
        for (const b of RANK_RANGE[a]) {
            ray[a][b] = RANK_RANGE[a].with(a);
            between[a][b] = rankAttacks(a, squareSet_1.SquareSet.fromSquare(b)).intersect(rankAttacks(b, squareSet_1.SquareSet.fromSquare(a)));
        }
    }
    return [ray, between];
}
const [RAY, BETWEEN] = rayTables();
function ray(a, b) {
    return RAY[a][b];
}
exports.ray = ray;
function between(a, b) {
    return BETWEEN[a][b];
}
exports.between = between;

},{"./squareSet":26,"./util":28}],21:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("./types");
const squareSet_1 = require("./squareSet");
class Board {
    constructor() { }
    static default() {
        const board = new Board();
        board.reset();
        return board;
    }
    static racingKings() {
        const board = new Board();
        board.occupied = new squareSet_1.SquareSet(0xffff, 0);
        board.promoted = squareSet_1.SquareSet.empty();
        board.white = new squareSet_1.SquareSet(0xf0f0, 0);
        board.black = new squareSet_1.SquareSet(0x0f0f, 0);
        board.pawn = squareSet_1.SquareSet.empty();
        board.knight = new squareSet_1.SquareSet(0x1818, 0);
        board.bishop = new squareSet_1.SquareSet(0x2424, 0);
        board.rook = new squareSet_1.SquareSet(0x4242, 0);
        board.queen = new squareSet_1.SquareSet(0x0081, 0);
        board.king = new squareSet_1.SquareSet(0x8100, 0);
        return board;
    }
    static horde() {
        const board = new Board();
        board.occupied = new squareSet_1.SquareSet(4294967295, 4294901862);
        board.promoted = squareSet_1.SquareSet.empty();
        board.white = new squareSet_1.SquareSet(4294967295, 102);
        board.black = new squareSet_1.SquareSet(0, 4294901760);
        board.pawn = new squareSet_1.SquareSet(4294967295, 16711782);
        board.knight = new squareSet_1.SquareSet(0, 1107296256);
        board.bishop = new squareSet_1.SquareSet(0, 603979776);
        board.rook = new squareSet_1.SquareSet(0, 2164260864);
        board.queen = new squareSet_1.SquareSet(0, 134217728);
        board.king = new squareSet_1.SquareSet(0, 268435456);
        return board;
    }
    reset() {
        this.occupied = new squareSet_1.SquareSet(0xffff, 4294901760);
        this.promoted = squareSet_1.SquareSet.empty();
        this.white = new squareSet_1.SquareSet(0xffff, 0);
        this.black = new squareSet_1.SquareSet(0, 4294901760);
        this.pawn = new squareSet_1.SquareSet(0xff00, 16711680);
        this.knight = new squareSet_1.SquareSet(0x42, 1107296256);
        this.bishop = new squareSet_1.SquareSet(0x24, 603979776);
        this.rook = new squareSet_1.SquareSet(0x81, 2164260864);
        this.queen = new squareSet_1.SquareSet(0x8, 134217728);
        this.king = new squareSet_1.SquareSet(0x10, 268435456);
    }
    static empty() {
        const board = new Board();
        board.clear();
        return board;
    }
    clear() {
        this.occupied = squareSet_1.SquareSet.empty();
        this.promoted = squareSet_1.SquareSet.empty();
        for (const color of types_1.COLORS)
            this[color] = squareSet_1.SquareSet.empty();
        for (const role of types_1.ROLES)
            this[role] = squareSet_1.SquareSet.empty();
    }
    clone() {
        const board = new Board();
        board.occupied = this.occupied;
        board.promoted = this.promoted;
        for (const color of types_1.COLORS)
            board[color] = this[color];
        for (const role of types_1.ROLES)
            board[role] = this[role];
        return board;
    }
    getColor(square) {
        if (this.white.has(square))
            return 'white';
        if (this.black.has(square))
            return 'black';
        return;
    }
    getRole(square) {
        for (const role of types_1.ROLES) {
            if (this[role].has(square))
                return role;
        }
        return;
    }
    get(square) {
        const color = this.getColor(square);
        if (!color)
            return;
        const promoted = this.promoted.has(square);
        const role = this.getRole(square);
        return { color, role, promoted };
    }
    take(square) {
        const piece = this.get(square);
        if (piece) {
            this.occupied = this.occupied.without(square);
            this[piece.color] = this[piece.color].without(square);
            this[piece.role] = this[piece.role].without(square);
            if (piece.promoted)
                this.promoted = this.promoted.without(square);
        }
        return piece;
    }
    set(square, piece) {
        const old = this.take(square);
        this.occupied = this.occupied.with(square);
        this[piece.color] = this[piece.color].with(square);
        this[piece.role] = this[piece.role].with(square);
        if (piece.promoted)
            this.promoted = this.promoted.with(square);
        return old;
    }
    has(square) {
        return this.occupied.has(square);
    }
    [Symbol.iterator]() {
        const keys = this.occupied[Symbol.iterator]();
        const next = () => {
            const entry = keys.next();
            if (entry.done)
                return { done: true };
            return { value: [entry.value, this.get(entry.value)], done: false };
        };
        return { next };
    }
    pieces(color, role) {
        return this[color].intersect(this[role]);
    }
    rooksAndQueens() {
        return this.rook.union(this.queen);
    }
    bishopsAndQueens() {
        return this.bishop.union(this.queen);
    }
    kingOf(color) {
        return this.king.intersect(this[color]).diff(this.promoted).singleSquare();
    }
}
exports.Board = Board;

},{"./squareSet":26,"./types":27}],22:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const result_1 = require("@badrap/result");
const types_1 = require("./types");
const squareSet_1 = require("./squareSet");
const board_1 = require("./board");
const attacks_1 = require("./attacks");
const util_1 = require("./util");
var IllegalSetup;
(function (IllegalSetup) {
    IllegalSetup["Empty"] = "ERR_EMPTY";
    IllegalSetup["OppositeCheck"] = "ERR_OPPOSITE_CHECK";
    IllegalSetup["PawnsOnBackrank"] = "ERR_PAWNS_ON_BACKRANK";
    IllegalSetup["Kings"] = "ERR_KINGS";
    IllegalSetup["Variant"] = "ERR_VARIANT";
})(IllegalSetup = exports.IllegalSetup || (exports.IllegalSetup = {}));
class PositionError extends Error {
}
exports.PositionError = PositionError;
function attacksTo(square, attacker, board, occupied) {
    return board[attacker].intersect(attacks_1.rookAttacks(square, occupied).intersect(board.rooksAndQueens())
        .union(attacks_1.bishopAttacks(square, occupied).intersect(board.bishopsAndQueens()))
        .union(attacks_1.knightAttacks(square).intersect(board.knight))
        .union(attacks_1.kingAttacks(square).intersect(board.king))
        .union(attacks_1.pawnAttacks(util_1.opposite(attacker), square).intersect(board.pawn)));
}
function kingCastlesTo(color, side) {
    return color === 'white' ? (side === 'a' ? 2 : 6) : (side === 'a' ? 58 : 62);
}
function rookCastlesTo(color, side) {
    return color === 'white' ? (side === 'a' ? 3 : 5) : (side === 'a' ? 59 : 61);
}
class Castles {
    constructor() { }
    static default() {
        const castles = new Castles();
        castles.unmovedRooks = squareSet_1.SquareSet.corners();
        castles.rook = {
            white: { a: 0, h: 7 },
            black: { a: 56, h: 63 },
        };
        castles.path = {
            white: { a: new squareSet_1.SquareSet(0x60, 0), h: new squareSet_1.SquareSet(0, 0xe) },
            black: { a: new squareSet_1.SquareSet(0, 0x60000000), h: new squareSet_1.SquareSet(0, 0x0e000000) },
        };
        return castles;
    }
    static empty() {
        const castles = new Castles();
        castles.unmovedRooks = squareSet_1.SquareSet.empty();
        castles.rook = {
            white: { a: undefined, h: undefined },
            black: { a: undefined, h: undefined },
        };
        castles.path = {
            white: { a: squareSet_1.SquareSet.empty(), h: squareSet_1.SquareSet.empty() },
            black: { a: squareSet_1.SquareSet.empty(), h: squareSet_1.SquareSet.empty() },
        };
        return castles;
    }
    clone() {
        const castles = new Castles();
        castles.unmovedRooks = this.unmovedRooks;
        castles.rook = {
            white: { a: this.rook.white.a, h: this.rook.white.h },
            black: { a: this.rook.black.a, h: this.rook.black.h },
        };
        castles.path = {
            white: { a: this.path.white.a, h: this.path.white.h },
            black: { a: this.path.black.a, h: this.path.black.h },
        };
        return castles;
    }
    add(color, side, king, rook) {
        const kingTo = kingCastlesTo(color, side);
        const rookTo = rookCastlesTo(color, side);
        this.unmovedRooks = this.unmovedRooks.with(rook);
        this.rook[color][side] = rook;
        this.path[color][side] = attacks_1.between(rook, rookTo).with(rookTo)
            .union(attacks_1.between(king, kingTo).with(kingTo))
            .without(king).without(rook);
    }
    static fromSetup(setup) {
        const castles = Castles.empty();
        const rooks = setup.unmovedRooks.intersect(setup.board.rook);
        for (const color of types_1.COLORS) {
            const backrank = squareSet_1.SquareSet.backrank(color);
            const king = setup.board.kingOf(color);
            if (!util_1.defined(king) || !backrank.has(king))
                continue;
            const side = rooks.intersect(setup.board[color]).intersect(backrank);
            const aSide = side.first();
            if (util_1.defined(aSide) && aSide < king)
                castles.add(color, 'a', king, aSide);
            const hSide = side.last();
            if (util_1.defined(hSide) && king < hSide)
                castles.add(color, 'h', king, hSide);
        }
        return castles;
    }
    discardRook(square) {
        if (this.unmovedRooks.has(square)) {
            this.unmovedRooks = this.unmovedRooks.without(square);
            for (const color of types_1.COLORS) {
                for (const side of types_1.CASTLING_SIDES) {
                    if (this.rook[color][side] === square)
                        this.rook[color][side] = undefined;
                }
            }
        }
    }
    discardSide(color) {
        this.unmovedRooks = this.unmovedRooks.diff(squareSet_1.SquareSet.backrank(color));
        this.rook[color].a = undefined;
        this.rook[color].h = undefined;
    }
}
exports.Castles = Castles;
class Position {
    constructor(rules) {
        this.rules = rules;
    }
    kingAttackers(square, attacker, occupied) {
        return attacksTo(square, attacker, this.board, occupied);
    }
    dropDests(_ctx) {
        return squareSet_1.SquareSet.empty();
    }
    playCaptureAt(square, captured) {
        this.halfmoves = 0;
        if (captured.role === 'rook')
            this.castles.discardRook(square);
        if (this.pockets)
            this.pockets[util_1.opposite(captured.color)][captured.role]++;
    }
    ctx() {
        const variantEnd = this.isVariantEnd();
        const king = this.board.kingOf(this.turn);
        if (!util_1.defined(king))
            return { king, blockers: squareSet_1.SquareSet.empty(), checkers: squareSet_1.SquareSet.empty(), variantEnd, mustCapture: false };
        const snipers = attacks_1.rookAttacks(king, squareSet_1.SquareSet.empty()).intersect(this.board.rooksAndQueens())
            .union(attacks_1.bishopAttacks(king, squareSet_1.SquareSet.empty()).intersect(this.board.bishopsAndQueens()))
            .intersect(this.board[util_1.opposite(this.turn)]);
        let blockers = squareSet_1.SquareSet.empty();
        for (const sniper of snipers) {
            const b = attacks_1.between(king, sniper).intersect(this.board.occupied);
            if (!b.moreThanOne())
                blockers = blockers.union(b);
        }
        const checkers = this.kingAttackers(king, util_1.opposite(this.turn), this.board.occupied);
        return {
            king,
            blockers,
            checkers,
            variantEnd,
            mustCapture: false,
        };
    }
    // The following should be identical in all subclasses
    clone() {
        const pos = new this.constructor();
        pos.board = this.board.clone();
        pos.pockets = this.pockets && this.pockets.clone();
        pos.turn = this.turn;
        pos.castles = this.castles.clone();
        pos.epSquare = this.epSquare;
        pos.remainingChecks = this.remainingChecks && this.remainingChecks.clone();
        pos.halfmoves = this.halfmoves;
        pos.fullmoves = this.fullmoves;
        return pos;
    }
    toSetup() {
        return {
            board: this.board.clone(),
            pockets: this.pockets && this.pockets.clone(),
            turn: this.turn,
            unmovedRooks: this.castles.unmovedRooks,
            epSquare: this.hasLegalEp() ? this.epSquare : undefined,
            remainingChecks: this.remainingChecks && this.remainingChecks.clone(),
            halfmoves: Math.min(this.halfmoves, 150),
            fullmoves: Math.min(Math.max(this.fullmoves, 1), 9999),
        };
    }
    isInsufficientMaterial() {
        return types_1.COLORS.every(color => this.hasInsufficientMaterial(color));
    }
    hasDests(ctx) {
        for (const square of this.board[this.turn]) {
            if (this.dests(square, ctx).nonEmpty())
                return true;
        }
        return this.dropDests(ctx).nonEmpty();
    }
    isLegal(uci, ctx) {
        if (types_1.isDrop(uci)) {
            if (!this.pockets || this.pockets[this.turn][uci.role] <= 0)
                return false;
            if (uci.role === 'pawn' && squareSet_1.SquareSet.backranks().has(uci.to))
                return false;
            return this.dropDests(ctx).has(uci.to);
        }
        else {
            if (uci.promotion === 'pawn')
                return false;
            if (uci.promotion === 'king' && this.rules !== 'antichess')
                return false;
            if (!uci.promotion && this.board.pawn.has(uci.from) && squareSet_1.SquareSet.backranks().has(uci.to))
                return false;
            return this.dests(uci.from, ctx).has(uci.to);
        }
    }
    isCheck() {
        const king = this.board.kingOf(this.turn);
        return util_1.defined(king) && this.kingAttackers(king, util_1.opposite(this.turn), this.board.occupied).nonEmpty();
    }
    isEnd() {
        return this.isVariantEnd() || this.isInsufficientMaterial() || !this.hasDests(this.ctx());
    }
    isCheckmate() {
        if (this.isVariantEnd())
            return false;
        const ctx = this.ctx();
        return ctx.checkers.nonEmpty() && !this.hasDests(ctx);
    }
    isStalemate() {
        if (this.isVariantEnd())
            return false;
        const ctx = this.ctx();
        return ctx.checkers.isEmpty() && !this.hasDests(ctx);
    }
    outcome() {
        const variantOutcome = this.variantOutcome();
        if (variantOutcome)
            return variantOutcome;
        else if (this.isCheckmate())
            return { winner: util_1.opposite(this.turn) };
        else if (this.isInsufficientMaterial() || this.isStalemate())
            return { winner: undefined };
        else
            return;
    }
    allDests() {
        const ctx = this.ctx();
        const d = new Map();
        if (ctx.variantEnd)
            return d;
        for (const square of this.board[this.turn]) {
            d.set(square, this.dests(square, ctx));
        }
        return d;
    }
    play(uci) {
        const turn = this.turn, epSquare = this.epSquare;
        this.epSquare = undefined;
        this.halfmoves += 1;
        if (turn === 'black')
            this.fullmoves += 1;
        this.turn = util_1.opposite(turn);
        if (types_1.isDrop(uci)) {
            this.board.set(uci.to, { role: uci.role, color: turn });
            if (this.pockets)
                this.pockets[turn][uci.role]--;
            if (uci.role === 'pawn')
                this.halfmoves = 0;
        }
        else {
            const piece = this.board.take(uci.from);
            if (!piece)
                return;
            let epCapture;
            if (piece.role === 'pawn') {
                this.halfmoves = 0;
                if (uci.to === epSquare) {
                    epCapture = this.board.take(uci.to + (turn === 'white' ? -8 : 8));
                }
                const delta = uci.from - uci.to;
                if (Math.abs(delta) === 16 && 8 <= uci.from && uci.from <= 55) {
                    this.epSquare = (uci.from + uci.to) >> 1;
                }
                if (uci.promotion) {
                    piece.role = uci.promotion;
                    piece.promoted = true;
                }
            }
            else if (piece.role === 'rook') {
                this.castles.discardRook(uci.from);
            }
            else if (piece.role === 'king') {
                const delta = uci.to - uci.from;
                const isCastling = Math.abs(delta) === 2 || this.board[turn].has(uci.to);
                if (isCastling) {
                    const side = delta > 0 ? 'h' : 'a';
                    const rookFrom = this.castles.rook[turn][side];
                    if (util_1.defined(rookFrom)) {
                        const rook = this.board.take(rookFrom);
                        this.board.set(kingCastlesTo(turn, side), piece);
                        if (rook)
                            this.board.set(rookCastlesTo(turn, side), rook);
                    }
                }
                this.castles.discardSide(turn);
                if (isCastling)
                    return;
            }
            const capture = this.board.set(uci.to, piece) || epCapture;
            if (capture)
                this.playCaptureAt(uci.to, capture);
        }
    }
    hasLegalEp() {
        if (!this.epSquare)
            return false;
        const ctx = this.ctx();
        const ourPawns = this.board.pieces(this.turn, 'pawn');
        const candidates = ourPawns.intersect(attacks_1.pawnAttacks(util_1.opposite(this.turn), this.epSquare));
        for (const candidate of candidates) {
            if (this.dests(candidate, ctx).has(this.epSquare))
                return true;
        }
        return false;
    }
}
exports.Position = Position;
class Chess extends Position {
    constructor(rules) {
        super(rules || 'chess');
    }
    static default() {
        const pos = new this();
        pos.board = board_1.Board.default();
        pos.pockets = undefined;
        pos.turn = 'white';
        pos.castles = Castles.default();
        pos.epSquare = undefined;
        pos.remainingChecks = undefined;
        pos.halfmoves = 0;
        pos.fullmoves = 1;
        return pos;
    }
    static fromSetup(setup) {
        const pos = new this();
        pos.board = setup.board.clone();
        pos.pockets = undefined;
        pos.turn = setup.turn;
        pos.castles = Castles.fromSetup(setup);
        pos.epSquare = pos.validEpSquare(setup.epSquare);
        pos.remainingChecks = undefined;
        pos.halfmoves = setup.halfmoves;
        pos.fullmoves = setup.fullmoves;
        return pos.validate().map(_ => pos);
    }
    clone() {
        return super.clone();
    }
    validate() {
        if (this.board.occupied.isEmpty())
            return result_1.Result.err(new PositionError(IllegalSetup.Empty));
        if (this.board.king.size() !== 2)
            return result_1.Result.err(new PositionError(IllegalSetup.Kings));
        if (!util_1.defined(this.board.kingOf(this.turn)))
            return result_1.Result.err(new PositionError(IllegalSetup.Kings));
        const otherKing = this.board.kingOf(util_1.opposite(this.turn));
        if (!util_1.defined(otherKing))
            return result_1.Result.err(new PositionError(IllegalSetup.Kings));
        if (this.kingAttackers(otherKing, this.turn, this.board.occupied).nonEmpty()) {
            return result_1.Result.err(new PositionError(IllegalSetup.OppositeCheck));
        }
        if (squareSet_1.SquareSet.backranks().intersects(this.board.pawn)) {
            return result_1.Result.err(new PositionError(IllegalSetup.PawnsOnBackrank));
        }
        return result_1.Result.ok(undefined);
    }
    validEpSquare(square) {
        if (!square)
            return;
        const epRank = this.turn === 'white' ? 5 : 2;
        const forward = this.turn === 'white' ? 8 : -8;
        if ((square >> 3) !== epRank)
            return;
        if (this.board.occupied.has(square + forward))
            return;
        const pawn = square - forward;
        if (!this.board.pawn.has(pawn) || !this.board[util_1.opposite(this.turn)].has(pawn))
            return;
        return square;
    }
    castlingDest(side, ctx) {
        if (!util_1.defined(ctx.king) || ctx.checkers.nonEmpty())
            return squareSet_1.SquareSet.empty();
        const rook = this.castles.rook[this.turn][side];
        if (!util_1.defined(rook))
            return squareSet_1.SquareSet.empty();
        if (this.castles.path[this.turn][side].intersects(this.board.occupied))
            return squareSet_1.SquareSet.empty();
        const kingTo = kingCastlesTo(this.turn, side);
        const kingPath = attacks_1.between(ctx.king, kingTo);
        const occ = this.board.occupied.without(ctx.king);
        for (const sq of kingPath) {
            if (this.kingAttackers(sq, util_1.opposite(this.turn), occ).nonEmpty())
                return squareSet_1.SquareSet.empty();
        }
        const rookTo = rookCastlesTo(this.turn, side);
        const after = this.board.occupied.toggle(ctx.king).toggle(rook).toggle(rookTo);
        if (this.kingAttackers(kingTo, util_1.opposite(this.turn), after).nonEmpty())
            return squareSet_1.SquareSet.empty();
        return squareSet_1.SquareSet.fromSquare(rook);
    }
    canCaptureEp(pawn, ctx) {
        if (!util_1.defined(this.epSquare))
            return false;
        if (!attacks_1.pawnAttacks(this.turn, pawn).has(this.epSquare))
            return false;
        if (!util_1.defined(ctx.king))
            return true;
        const captured = this.epSquare + ((this.turn === 'white') ? -8 : 8);
        const occupied = this.board.occupied.toggle(pawn).toggle(this.epSquare).toggle(captured);
        return !this.kingAttackers(ctx.king, util_1.opposite(this.turn), occupied).intersects(occupied);
    }
    pseudoDests(square, ctx) {
        if (ctx.variantEnd)
            return squareSet_1.SquareSet.empty();
        const piece = this.board.get(square);
        if (!piece || piece.color !== this.turn)
            return squareSet_1.SquareSet.empty();
        let pseudo = attacks_1.attacks(piece, square, this.board.occupied);
        if (piece.role === 'pawn') {
            let captureTargets = this.board[util_1.opposite(this.turn)];
            if (util_1.defined(this.epSquare))
                captureTargets = captureTargets.with(this.epSquare);
            pseudo = pseudo.intersect(captureTargets);
            const delta = this.turn === 'white' ? 8 : -8;
            const step = square + delta;
            if (0 <= step && step < 64 && !this.board.occupied.has(step)) {
                pseudo = pseudo.with(step);
                const canDoubleStep = this.turn === 'white' ? (square < 16) : (square >= 64 - 16);
                const doubleStep = step + delta;
                if (canDoubleStep && !this.board.occupied.has(doubleStep)) {
                    pseudo = pseudo.with(doubleStep);
                }
            }
            return pseudo;
        }
        else {
            pseudo = pseudo.diff(this.board[this.turn]);
        }
        if (square === ctx.king)
            return pseudo.union(this.castlingDest('a', ctx)).union(this.castlingDest('h', ctx));
        else
            return pseudo;
    }
    dests(square, ctx) {
        if (ctx.variantEnd)
            return squareSet_1.SquareSet.empty();
        const piece = this.board.get(square);
        if (!piece || piece.color !== this.turn)
            return squareSet_1.SquareSet.empty();
        let pseudo, legal;
        if (piece.role === 'pawn') {
            pseudo = attacks_1.pawnAttacks(this.turn, square).intersect(this.board[util_1.opposite(this.turn)]);
            const delta = this.turn === 'white' ? 8 : -8;
            const step = square + delta;
            if (0 <= step && step < 64 && !this.board.occupied.has(step)) {
                pseudo = pseudo.with(step);
                const canDoubleStep = this.turn === 'white' ? (square < 16) : (square >= 64 - 16);
                const doubleStep = step + delta;
                if (canDoubleStep && !this.board.occupied.has(doubleStep)) {
                    pseudo = pseudo.with(doubleStep);
                }
            }
            if (util_1.defined(this.epSquare) && this.canCaptureEp(square, ctx)) {
                const pawn = this.epSquare - delta;
                if (ctx.checkers.isEmpty() || ctx.checkers.singleSquare() === pawn) {
                    legal = squareSet_1.SquareSet.fromSquare(this.epSquare);
                }
            }
        }
        else if (piece.role === 'bishop')
            pseudo = attacks_1.bishopAttacks(square, this.board.occupied);
        else if (piece.role === 'knight')
            pseudo = attacks_1.knightAttacks(square);
        else if (piece.role === 'rook')
            pseudo = attacks_1.rookAttacks(square, this.board.occupied);
        else if (piece.role === 'queen')
            pseudo = attacks_1.queenAttacks(square, this.board.occupied);
        else
            pseudo = attacks_1.kingAttacks(square);
        pseudo = pseudo.diff(this.board[this.turn]);
        if (util_1.defined(ctx.king)) {
            if (piece.role === 'king') {
                const occ = this.board.occupied.without(square);
                for (const to of pseudo) {
                    if (this.kingAttackers(to, util_1.opposite(this.turn), occ).nonEmpty())
                        pseudo = pseudo.without(to);
                }
                return pseudo.union(this.castlingDest('a', ctx)).union(this.castlingDest('h', ctx));
            }
            if (ctx.checkers.nonEmpty()) {
                const checker = ctx.checkers.singleSquare();
                if (!util_1.defined(checker))
                    return squareSet_1.SquareSet.empty();
                pseudo = pseudo.intersect(attacks_1.between(checker, ctx.king).with(checker));
            }
            if (ctx.blockers.has(square))
                pseudo = pseudo.intersect(attacks_1.ray(square, ctx.king));
        }
        if (legal)
            pseudo = pseudo.union(legal);
        return pseudo;
    }
    isVariantEnd() {
        return false;
    }
    variantOutcome() {
        return;
    }
    hasInsufficientMaterial(color) {
        if (this.board[color].intersect(this.board.pawn.union(this.board.rooksAndQueens())).nonEmpty())
            return false;
        if (this.board[color].intersects(this.board.knight)) {
            return this.board[color].size() <= 2 &&
                this.board[util_1.opposite(color)].diff(this.board.king).diff(this.board.queen).isEmpty();
        }
        if (this.board[color].intersects(this.board.bishop)) {
            const sameColor = !this.board.bishop.intersects(squareSet_1.SquareSet.darkSquares()) ||
                !this.board.bishop.intersects(squareSet_1.SquareSet.lightSquares());
            return sameColor && this.board[util_1.opposite(color)].diff(this.board.king).diff(this.board.rook).diff(this.board.queen).isEmpty();
        }
        return true;
    }
}
exports.Chess = Chess;

},{"./attacks":20,"./board":21,"./squareSet":26,"./types":27,"./util":28,"@badrap/result":1}],23:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const result_1 = require("@badrap/result");
const types_1 = require("./types");
const squareSet_1 = require("./squareSet");
const board_1 = require("./board");
const setup_1 = require("./setup");
const util_1 = require("./util");
exports.INITIAL_BOARD_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
exports.INITIAL_EPD = exports.INITIAL_BOARD_FEN + ' w KQkq -';
exports.INITIAL_FEN = exports.INITIAL_EPD + ' 0 1';
exports.EMPTY_BOARD_FEN = '8/8/8/8/8/8/8/8';
exports.EMPTY_EPD = exports.EMPTY_BOARD_FEN + ' w - -';
exports.EMPTY_FEN = exports.EMPTY_EPD + ' 0 1';
var InvalidFen;
(function (InvalidFen) {
    InvalidFen["Fen"] = "ERR_FEN";
    InvalidFen["Board"] = "ERR_BOARD";
    InvalidFen["Pockets"] = "ERR_POCKETS";
    InvalidFen["Turn"] = "ERR_TURN";
    InvalidFen["Castling"] = "ERR_CASTLING";
    InvalidFen["EpSquare"] = "ERR_EP_SQUARE";
    InvalidFen["RemainingChecks"] = "ERR_REMAINING_CHECKS";
    InvalidFen["Halfmoves"] = "ERR_HALFMOVES";
    InvalidFen["Fullmoves"] = "ERR_FULLMOVES";
})(InvalidFen = exports.InvalidFen || (exports.InvalidFen = {}));
class FenError extends Error {
}
exports.FenError = FenError;
function nthIndexOf(haystack, needle, n) {
    let index = haystack.indexOf(needle);
    while (n-- > 0) {
        if (index === -1)
            break;
        index = haystack.indexOf(needle, index + needle.length);
    }
    return index;
}
function parseSmallUint(str) {
    return /^\d{1,4}$/.test(str) ? parseInt(str, 10) : undefined;
}
function charToPiece(ch) {
    const role = util_1.charToRole(ch);
    return role && { role, color: ch.toLowerCase() === ch ? 'black' : 'white' };
}
function parseBoardFen(boardPart) {
    const board = board_1.Board.empty();
    let rank = 7;
    let file = 0;
    for (let i = 0; i < boardPart.length; i++) {
        const c = boardPart[i];
        if (c === '/' && file === 8) {
            file = 0;
            rank--;
        }
        else {
            const step = parseInt(c, 10);
            if (step)
                file += step;
            else {
                if (file >= 8 || rank < 0)
                    return result_1.Result.err(new FenError(InvalidFen.Board));
                const square = file + rank * 8;
                const piece = charToPiece(c);
                if (!piece)
                    return result_1.Result.err(new FenError(InvalidFen.Board));
                if (boardPart[i + 1] === '~') {
                    piece.promoted = true;
                    i++;
                }
                board.set(square, piece);
                file++;
            }
        }
    }
    if (rank !== 0 || file !== 8)
        return result_1.Result.err(new FenError(InvalidFen.Board));
    return result_1.Result.ok(board);
}
exports.parseBoardFen = parseBoardFen;
function parsePockets(pocketPart) {
    if (pocketPart.length > 64)
        return result_1.Result.err(new FenError(InvalidFen.Pockets));
    const pockets = setup_1.Material.empty();
    for (const c of pocketPart) {
        const piece = charToPiece(c);
        if (!piece)
            return result_1.Result.err(new FenError(InvalidFen.Pockets));
        pockets[piece.color][piece.role]++;
    }
    return result_1.Result.ok(pockets);
}
exports.parsePockets = parsePockets;
function parseCastlingFen(board, castlingPart) {
    let unmovedRooks = squareSet_1.SquareSet.empty();
    if (castlingPart === '-')
        return result_1.Result.ok(unmovedRooks);
    if (!/^[KQABCDEFGH]{0,2}[kqabcdefgh]{0,2}$/.test(castlingPart)) {
        return result_1.Result.err(new FenError(InvalidFen.Castling));
    }
    for (const c of castlingPart) {
        const lower = c.toLowerCase();
        const color = c === lower ? 'black' : 'white';
        const backrank = squareSet_1.SquareSet.backrank(color).intersect(board[color]);
        let candidates;
        if (lower === 'q')
            candidates = backrank;
        else if (lower === 'k')
            candidates = backrank.reversed();
        else
            candidates = squareSet_1.SquareSet.fromSquare(lower.charCodeAt(0) - 'a'.charCodeAt(0)).intersect(backrank);
        for (const square of candidates) {
            if (board.king.has(square) && !board.promoted.has(square))
                break;
            if (board.rook.has(square)) {
                unmovedRooks = unmovedRooks.with(square);
                break;
            }
        }
    }
    return result_1.Result.ok(unmovedRooks);
}
exports.parseCastlingFen = parseCastlingFen;
function parseRemainingChecks(part) {
    const parts = part.split('+');
    if (parts.length === 3 && parts[0] === '') {
        const white = parseSmallUint(parts[1]);
        const black = parseSmallUint(parts[2]);
        if (!util_1.defined(white) || white > 3 || !util_1.defined(black) || black > 3)
            return result_1.Result.err(new FenError(InvalidFen.RemainingChecks));
        return result_1.Result.ok(new setup_1.RemainingChecks(3 - white, 3 - black));
    }
    else if (parts.length === 2) {
        const white = parseSmallUint(parts[0]);
        const black = parseSmallUint(parts[1]);
        if (!util_1.defined(white) || white > 3 || !util_1.defined(black) || black > 3)
            return result_1.Result.err(new FenError(InvalidFen.RemainingChecks));
        return result_1.Result.ok(new setup_1.RemainingChecks(white, black));
    }
    else
        return result_1.Result.err(new FenError(InvalidFen.RemainingChecks));
}
exports.parseRemainingChecks = parseRemainingChecks;
function parseFen(fen) {
    const parts = fen.split(' ');
    const boardPart = parts.shift();
    // Board and pockets
    let board, pockets = result_1.Result.ok(undefined);
    if (boardPart.endsWith(']')) {
        const pocketStart = boardPart.indexOf('[');
        if (pocketStart === -1)
            return result_1.Result.err(new FenError(InvalidFen.Fen));
        board = parseBoardFen(boardPart.substr(0, pocketStart));
        pockets = parsePockets(boardPart.substr(pocketStart + 1, boardPart.length - 1 - pocketStart - 1));
    }
    else {
        const pocketStart = nthIndexOf(boardPart, '/', 7);
        if (pocketStart === -1)
            board = parseBoardFen(boardPart);
        else {
            board = parseBoardFen(boardPart.substr(0, pocketStart));
            pockets = parsePockets(boardPart.substr(pocketStart + 1));
        }
    }
    // Turn
    let turn;
    const turnPart = parts.shift();
    if (!util_1.defined(turnPart) || turnPart === 'w')
        turn = 'white';
    else if (turnPart === 'b')
        turn = 'black';
    else
        return result_1.Result.err(new FenError(InvalidFen.Turn));
    return board.chain(board => {
        // Castling
        const castlingPart = parts.shift();
        const unmovedRooks = util_1.defined(castlingPart) ? parseCastlingFen(board, castlingPart) : result_1.Result.ok(squareSet_1.SquareSet.empty());
        // En passant square
        const epPart = parts.shift();
        let epSquare;
        if (util_1.defined(epPart) && epPart !== '-') {
            epSquare = util_1.parseSquare(epPart);
            if (!util_1.defined(epSquare))
                return result_1.Result.err(new FenError(InvalidFen.EpSquare));
        }
        // Halfmoves or remaining checks
        let halfmovePart = parts.shift();
        let earlyRemainingChecks;
        if (util_1.defined(halfmovePart) && halfmovePart.includes('+')) {
            earlyRemainingChecks = parseRemainingChecks(halfmovePart);
            halfmovePart = parts.shift();
        }
        const halfmoves = util_1.defined(halfmovePart) ? parseSmallUint(halfmovePart) : 0;
        if (!util_1.defined(halfmoves))
            return result_1.Result.err(new FenError(InvalidFen.Halfmoves));
        const fullmovesPart = parts.shift();
        const fullmoves = util_1.defined(fullmovesPart) ? parseSmallUint(fullmovesPart) : 1;
        if (!util_1.defined(fullmoves))
            return result_1.Result.err(new FenError(InvalidFen.Fullmoves));
        const remainingChecksPart = parts.shift();
        let remainingChecks = result_1.Result.ok(undefined);
        if (util_1.defined(remainingChecksPart)) {
            if (util_1.defined(earlyRemainingChecks))
                return result_1.Result.err(new FenError(InvalidFen.RemainingChecks));
            remainingChecks = parseRemainingChecks(remainingChecksPart);
        }
        else if (util_1.defined(earlyRemainingChecks)) {
            remainingChecks = earlyRemainingChecks;
        }
        ;
        if (parts.length)
            return result_1.Result.err(new FenError(InvalidFen.Fen));
        return pockets.chain(pockets => unmovedRooks.chain(unmovedRooks => remainingChecks.map(remainingChecks => {
            return {
                board,
                pockets,
                turn,
                unmovedRooks,
                remainingChecks,
                epSquare,
                halfmoves,
                fullmoves: Math.max(1, fullmoves)
            };
        })));
    });
}
exports.parseFen = parseFen;
function parsePiece(str) {
    if (!str)
        return;
    const piece = charToPiece(str[0]);
    if (!piece)
        return;
    if (str.length === 2 && str[1] === '~')
        piece.promoted = true;
    else if (str.length > 1)
        return;
    return piece;
}
exports.parsePiece = parsePiece;
function makePiece(piece, opts) {
    let r = util_1.roleToChar(piece.role);
    if (piece.color === 'white')
        r = r.toUpperCase();
    if (opts && opts.promoted && piece.promoted)
        r += '~';
    return r;
}
exports.makePiece = makePiece;
function makeBoardFen(board, opts) {
    let fen = '';
    let empty = 0;
    for (let rank = 7; rank >= 0; rank--) {
        for (let file = 0; file < 8; file++) {
            const square = file + rank * 8;
            const piece = board.get(square);
            if (!piece)
                empty++;
            else {
                if (empty) {
                    fen += empty;
                    empty = 0;
                }
                fen += makePiece(piece, opts);
            }
            if (file === 7) {
                if (empty) {
                    fen += empty;
                    empty = 0;
                }
                if (rank !== 0)
                    fen += '/';
            }
        }
    }
    return fen;
}
exports.makeBoardFen = makeBoardFen;
function makePocket(material) {
    return types_1.ROLES.map(role => util_1.roleToChar(role).repeat(material[role])).join('');
}
function makePockets(pocket) {
    return makePocket(pocket.white).toUpperCase() + makePocket(pocket.black);
}
exports.makePockets = makePockets;
function makeCastlingFen(board, unmovedRooks, opts) {
    const shredder = opts && opts.shredder;
    let fen = '';
    for (const color of types_1.COLORS) {
        const backrank = squareSet_1.SquareSet.backrank(color);
        const king = board.kingOf(color);
        if (!util_1.defined(king) || !backrank.has(king))
            continue;
        const candidates = board.pieces(color, 'rook').intersect(backrank);
        for (const rook of unmovedRooks.intersect(candidates).reversed()) {
            if (!shredder && rook === candidates.first() && rook < king) {
                fen += color === 'white' ? 'Q' : 'q';
            }
            else if (!shredder && rook === candidates.last() && king < rook) {
                fen += color === 'white' ? 'K' : 'k';
            }
            else {
                fen += (color === 'white' ? 'ABCDEFGH' : 'abcdefgh')[rook & 0x7];
            }
        }
    }
    return fen || '-';
}
exports.makeCastlingFen = makeCastlingFen;
function makeRemainingChecks(checks) {
    return `${checks.white}+${checks.black}`;
}
exports.makeRemainingChecks = makeRemainingChecks;
function makeFen(setup, opts) {
    return [
        makeBoardFen(setup.board, opts) + (setup.pockets ? `[${makePockets(setup.pockets)}]` : ''),
        setup.turn[0],
        makeCastlingFen(setup.board, setup.unmovedRooks, opts),
        util_1.defined(setup.epSquare) ? util_1.makeSquare(setup.epSquare) : '-',
        ...(setup.remainingChecks ? [makeRemainingChecks(setup.remainingChecks)] : []),
        ...(opts && opts.epd ? [] : [setup.halfmoves, setup.fullmoves])
    ].join(' ');
}
exports.makeFen = makeFen;

},{"./board":21,"./setup":25,"./squareSet":26,"./types":27,"./util":28,"@badrap/result":1}],24:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("./types");
const util_1 = require("./util");
const squareSet_1 = require("./squareSet");
const attacks_1 = require("./attacks");
function makeSanWithoutSuffix(pos, uci) {
    let san = '';
    if (types_1.isDrop(uci)) {
        if (uci.role !== 'pawn')
            san = util_1.roleToChar(uci.role).toUpperCase();
        san += '@' + util_1.makeSquare(uci.to);
    }
    else {
        const role = pos.board.getRole(uci.from);
        if (!role)
            return '--';
        if (role === 'king' && (pos.board[pos.turn].has(uci.to) || Math.abs(uci.to - uci.from) === 2)) {
            san = uci.to > uci.from ? 'O-O' : 'O-O-O';
        }
        else {
            const capture = pos.board.occupied.has(uci.to) || (role === 'pawn' && (uci.from & 0x7) !== (uci.to & 0x7));
            if (role !== 'pawn') {
                san = util_1.roleToChar(role).toUpperCase();
                // Disambiguation
                let others;
                if (role === 'king')
                    others = attacks_1.kingAttacks(uci.to).intersect(pos.board.king);
                else if (role === 'queen')
                    others = attacks_1.queenAttacks(uci.to, pos.board.occupied).intersect(pos.board.queen);
                else if (role === 'rook')
                    others = attacks_1.rookAttacks(uci.to, pos.board.occupied).intersect(pos.board.rook);
                else if (role === 'bishop')
                    others = attacks_1.bishopAttacks(uci.to, pos.board.occupied).intersect(pos.board.bishop);
                else
                    others = attacks_1.knightAttacks(uci.to).intersect(pos.board.knight);
                others = others.intersect(pos.board[pos.turn]).without(uci.from);
                if (others.nonEmpty()) {
                    const ctx = pos.ctx();
                    for (const from of others) {
                        if (!pos.dests(from, ctx).has(uci.to))
                            others = others.without(from);
                    }
                    if (others.nonEmpty()) {
                        let row = false;
                        let column = others.intersects(squareSet_1.SquareSet.fromRank(uci.from >> 3));
                        if (others.intersects(squareSet_1.SquareSet.fromFile(uci.from & 0x7)))
                            row = true;
                        else
                            column = true;
                        if (column)
                            san += 'abcdefgh'[uci.from & 0x7];
                        if (row)
                            san += '12345678'[uci.from >> 3];
                    }
                }
            }
            else if (capture)
                san = 'abcdefgh'[uci.from & 0x7];
            if (capture)
                san += 'x';
            san += util_1.makeSquare(uci.to);
            if (uci.promotion)
                san += '=' + util_1.roleToChar(uci.promotion).toUpperCase();
        }
    }
    return san;
}
function makeSanAndPlay(pos, uci) {
    const san = makeSanWithoutSuffix(pos, uci);
    pos.play(uci);
    const outcome = pos.outcome();
    if (outcome && outcome.winner)
        return san + '#';
    else if (pos.isCheck())
        return san + '+';
    else
        return san;
}
exports.makeSanAndPlay = makeSanAndPlay;
function makeSanVariation(pos, variation) {
    pos = pos.clone();
    let line = '';
    for (let i = 0; i < variation.length; i++) {
        if (i !== 0)
            line += ' ';
        if (pos.turn === 'white')
            line += pos.fullmoves + '. ';
        else if (i === 0)
            line = pos.fullmoves + '... ';
        const san = makeSanWithoutSuffix(pos, variation[i]);
        pos.play(variation[i]);
        line += san;
        if (san === '--')
            return line;
        let over = false;
        if (i === variation.length - 1) {
            const outcome = pos.outcome();
            over = !!(outcome && outcome.winner);
        }
        if (over)
            line += '#';
        else if (pos.isCheck())
            line += '+';
    }
    return line;
}
exports.makeSanVariation = makeSanVariation;
function makeSan(pos, uci) {
    return makeSanAndPlay(pos.clone(), uci);
}
exports.makeSan = makeSan;

},{"./attacks":20,"./squareSet":26,"./types":27,"./util":28}],25:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("./types");
const squareSet_1 = require("./squareSet");
const board_1 = require("./board");
class MaterialSide {
    constructor() { }
    static empty() {
        const m = new MaterialSide();
        for (const role of types_1.ROLES)
            m[role] = 0;
        return m;
    }
    clone() {
        const m = new MaterialSide();
        for (const role of types_1.ROLES)
            m[role] = this[role];
        return m;
    }
    nonEmpty() {
        return types_1.ROLES.some(role => this[role] > 0);
    }
    isEmpty() {
        return !this.nonEmpty();
    }
    hasPawns() {
        return this.pawn > 0;
    }
    hasNonPawns() {
        return this.knight > 0 || this.bishop > 0 || this.rook > 0 || this.queen > 0 || this.king > 0;
    }
    count() {
        return this.pawn + this.knight + this.bishop + this.rook + this.queen + this.king;
    }
}
exports.MaterialSide = MaterialSide;
class Material {
    constructor(white, black) {
        this.white = white;
        this.black = black;
    }
    static empty() {
        return new Material(MaterialSide.empty(), MaterialSide.empty());
    }
    clone() {
        return new Material(this.white.clone(), this.black.clone());
    }
    count() {
        return this.white.count() + this.black.count();
    }
    isEmpty() {
        return this.white.isEmpty() && this.black.isEmpty();
    }
    nonEmpty() {
        return !this.isEmpty();
    }
    hasPawns() {
        return this.white.hasPawns() || this.black.hasPawns();
    }
    hasNonPawns() {
        return this.white.hasNonPawns() || this.black.hasNonPawns();
    }
}
exports.Material = Material;
class RemainingChecks {
    constructor(white, black) {
        this.white = white;
        this.black = black;
    }
    static default() {
        return new RemainingChecks(3, 3);
    }
    clone() {
        return new RemainingChecks(this.white, this.black);
    }
}
exports.RemainingChecks = RemainingChecks;
function defaultSetup() {
    return {
        board: board_1.Board.default(),
        pockets: undefined,
        turn: 'white',
        unmovedRooks: squareSet_1.SquareSet.corners(),
        epSquare: undefined,
        remainingChecks: undefined,
        halfmoves: 0,
        fullmoves: 1,
    };
}
exports.defaultSetup = defaultSetup;

},{"./board":21,"./squareSet":26,"./types":27}],26:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function popcnt32(n) {
    n = n - ((n >>> 1) & 1431655765);
    n = (n & 858993459) + ((n >>> 2) & 858993459);
    return ((n + (n >>> 4) & 252645135) * 16843009) >> 24;
}
function bswap32(n) {
    n = (n >>> 8) & 16711935 | ((n & 16711935) << 8);
    return (n >>> 16) & 0xffff | ((n & 0xffff) << 16);
}
function rbit32(n) {
    n = ((n >>> 1) & 1431655765) | ((n & 1431655765) << 1);
    n = ((n >>> 2) & 858993459) | ((n & 858993459) << 2);
    n = ((n >>> 4) & 252645135) | ((n & 252645135) << 4);
    n = ((n >>> 8) & 16711935) | ((n & 16711935) << 8);
    n = ((n >>> 16) & 65535) | ((n & 65535) << 16);
    return n;
}
class SquareSet {
    constructor(lo, hi) {
        this.lo = lo;
        this.hi = hi;
        this.lo = lo | 0;
        this.hi = hi | 0;
    }
    static fromSquare(square) {
        return square >= 32 ?
            new SquareSet(0, 1 << (square - 32)) :
            new SquareSet(1 << square, 0);
    }
    static fromRank(rank) {
        return new SquareSet(0xff, 0).shl64(8 * rank);
    }
    static fromFile(file) {
        return new SquareSet(16843009 << file, 16843009 << file);
    }
    static empty() {
        return new SquareSet(0, 0);
    }
    static full() {
        return new SquareSet(4294967295, 4294967295);
    }
    static corners() {
        return new SquareSet(0x81, 2164260864);
    }
    static center() {
        return new SquareSet(402653184, 0x18);
    }
    static backranks() {
        return new SquareSet(0xff, 4278190080);
    }
    static backrank(color) {
        return color === 'white' ? new SquareSet(0xff, 0) : new SquareSet(0, 4278190080);
    }
    static lightSquares() {
        return new SquareSet(1437226410, 1437226410);
    }
    static darkSquares() {
        return new SquareSet(2857740885, 2857740885);
    }
    complement() {
        return new SquareSet(~this.lo, ~this.hi);
    }
    xor(other) {
        return new SquareSet(this.lo ^ other.lo, this.hi ^ other.hi);
    }
    union(other) {
        return new SquareSet(this.lo | other.lo, this.hi | other.hi);
    }
    intersect(other) {
        return new SquareSet(this.lo & other.lo, this.hi & other.hi);
    }
    diff(other) {
        return new SquareSet(this.lo & ~other.lo, this.hi & ~other.hi);
    }
    intersects(other) {
        return this.intersect(other).nonEmpty();
    }
    isDisjoint(other) {
        return this.intersect(other).isEmpty();
    }
    supersetOf(other) {
        return other.diff(this).isEmpty();
    }
    subsetOf(other) {
        return this.diff(other).isEmpty();
    }
    shr64(shift) {
        if (shift >= 64)
            return SquareSet.empty();
        if (shift >= 32)
            return new SquareSet(this.hi >>> (shift - 32), 0);
        if (shift > 0)
            return new SquareSet((this.lo >>> shift) ^ (this.hi << (32 - shift)), this.hi >>> shift);
        return this;
    }
    shl64(shift) {
        if (shift >= 64)
            return SquareSet.empty();
        if (shift >= 32)
            return new SquareSet(0, this.lo << (shift - 32));
        if (shift > 0)
            return new SquareSet(this.lo << shift, (this.hi << shift) ^ (this.lo >>> (32 - shift)));
        return this;
    }
    bswap64() {
        return new SquareSet(bswap32(this.hi), bswap32(this.lo));
    }
    rbit64() {
        return new SquareSet(rbit32(this.hi), rbit32(this.lo));
    }
    equals(other) {
        return this.lo === other.lo && this.hi === other.hi;
    }
    size() {
        return popcnt32(this.lo) + popcnt32(this.hi);
    }
    isEmpty() {
        return this.lo === 0 && this.hi === 0;
    }
    nonEmpty() {
        return this.lo !== 0 || this.hi !== 0;
    }
    has(square) {
        return !!(square >= 32 ? this.hi & (1 << (square - 32)) : this.lo & (1 << square));
    }
    set(square, on) {
        return on ? this.with(square) : this.without(square);
    }
    with(square) {
        return square >= 32 ?
            new SquareSet(this.lo, this.hi | (1 << (square - 32))) :
            new SquareSet(this.lo | (1 << square), this.hi);
    }
    without(square) {
        return square >= 32 ?
            new SquareSet(this.lo, this.hi & ~(1 << (square - 32))) :
            new SquareSet(this.lo & ~(1 << square), this.hi);
    }
    toggle(square) {
        return square >= 32 ?
            new SquareSet(this.lo, this.hi ^ (1 << (square - 32))) :
            new SquareSet(this.lo ^ (1 << square), this.hi);
    }
    last() {
        if (this.hi !== 0)
            return 63 - Math.clz32(this.hi);
        if (this.lo !== 0)
            return 31 - Math.clz32(this.lo);
        return;
    }
    first() {
        if (this.lo !== 0)
            return 31 - Math.clz32(this.lo & -this.lo);
        if (this.hi !== 0)
            return 63 - Math.clz32(this.hi & -this.hi);
        return;
    }
    moreThanOne() {
        return !!((this.hi && this.lo) || this.lo & (this.lo - 1) || this.hi & (this.hi - 1));
    }
    singleSquare() {
        return this.moreThanOne() ? undefined : this.last();
    }
    isSingleSquare() {
        return this.nonEmpty() && !this.moreThanOne();
    }
    [Symbol.iterator]() {
        let lo = this.lo;
        let hi = this.hi;
        return {
            next() {
                if (lo) {
                    const idx = 31 - Math.clz32(lo & -lo);
                    lo ^= 1 << idx;
                    return { value: idx, done: false };
                }
                if (hi) {
                    const idx = 31 - Math.clz32(hi & -hi);
                    hi ^= 1 << idx;
                    return { value: 32 + idx, done: false };
                }
                return { done: true };
            }
        };
    }
    reversed() {
        let lo = this.lo;
        let hi = this.hi;
        return {
            [Symbol.iterator]() {
                return {
                    next() {
                        if (hi) {
                            const idx = 31 - Math.clz32(hi);
                            hi ^= 1 << idx;
                            return { value: 32 + idx, done: false };
                        }
                        if (lo) {
                            const idx = 31 - Math.clz32(lo);
                            lo ^= 1 << idx;
                            return { value: idx, done: false };
                        }
                        return { done: true };
                    }
                };
            }
        };
    }
    minus64(other) {
        const lo = this.lo - other.lo;
        const c = ((lo & other.lo & 1) + (other.lo >>> 1) + (lo >>> 1)) >>> 31;
        return new SquareSet(lo, this.hi - (other.hi + c));
    }
}
exports.SquareSet = SquareSet;

},{}],27:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COLORS = ['white', 'black'];
exports.ROLES = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];
exports.CASTLING_SIDES = ['a', 'h'];
function isDrop(v) {
    return 'role' in v;
}
exports.isDrop = isDrop;
function isMove(v) {
    return 'from' in v;
}
exports.isMove = isMove;
exports.RULES = ['chess', 'antichess', 'kingofthehill', '3check', 'atomic', 'horde', 'racingkings', 'crazyhouse'];

},{}],28:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("./types");
function defined(v) {
    return typeof v !== 'undefined';
}
exports.defined = defined;
function opposite(color) {
    return color === 'white' ? 'black' : 'white';
}
exports.opposite = opposite;
function squareDist(a, b) {
    const x1 = a & 0x7, x2 = b & 0x7;
    const y1 = a >> 3, y2 = b >> 3;
    return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
}
exports.squareDist = squareDist;
function squareRank(square) {
    return square >> 3;
}
exports.squareRank = squareRank;
function squareFile(square) {
    return square & 0x7;
}
exports.squareFile = squareFile;
function roleToChar(role) {
    switch (role) {
        case 'pawn': return 'p';
        case 'knight': return 'n';
        case 'bishop': return 'b';
        case 'rook': return 'r';
        case 'queen': return 'q';
        case 'king': return 'k';
    }
}
exports.roleToChar = roleToChar;
function charToRole(ch) {
    switch (ch) {
        case 'P':
        case 'p': return 'pawn';
        case 'N':
        case 'n': return 'knight';
        case 'B':
        case 'b': return 'bishop';
        case 'R':
        case 'r': return 'rook';
        case 'Q':
        case 'q': return 'queen';
        case 'K':
        case 'k': return 'king';
        default: return;
    }
}
exports.charToRole = charToRole;
function parseSquare(str) {
    if (!/^[a-h][1-8]$/.test(str))
        return;
    return str.charCodeAt(0) - 'a'.charCodeAt(0) + 8 * (str.charCodeAt(1) - '1'.charCodeAt(0));
}
exports.parseSquare = parseSquare;
function makeSquare(square) {
    return 'abcdefgh'[square & 0x7] + '12345678'[square >> 3];
}
exports.makeSquare = makeSquare;
function parseUci(str) {
    if (str[1] === '@' && str.length === 4) {
        const role = charToRole(str[0]);
        const to = parseSquare(str.slice(2));
        if (role && defined(to))
            return { role, to };
    }
    else if (str.length === 4 || str.length === 5) {
        const from = parseSquare(str.slice(0, 2));
        const to = parseSquare(str.slice(2, 4));
        let promotion;
        if (str.length === 5) {
            promotion = charToRole(str[4]);
            if (!promotion)
                return;
        }
        if (defined(from) && defined(to))
            return { from, to, promotion };
    }
    return;
}
exports.parseUci = parseUci;
function makeUci(uci) {
    if (types_1.isDrop(uci))
        return `${roleToChar(uci.role).toUpperCase()}@${makeSquare(uci.to)}`;
    return makeSquare(uci.from) + makeSquare(uci.to) + (uci.promotion ? roleToChar(uci.promotion) : '');
}
exports.makeUci = makeUci;

},{"./types":27}],29:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const result_1 = require("@badrap/result");
const types_1 = require("./types");
const util_1 = require("./util");
const attacks_1 = require("./attacks");
const squareSet_1 = require("./squareSet");
const board_1 = require("./board");
const setup_1 = require("./setup");
const chess_1 = require("./chess");
exports.PositionError = chess_1.PositionError;
exports.Position = chess_1.Position;
exports.IllegalSetup = chess_1.IllegalSetup;
exports.Castles = chess_1.Castles;
exports.Chess = chess_1.Chess;
class Crazyhouse extends chess_1.Chess {
    constructor() {
        super('crazyhouse');
    }
    static default() {
        const pos = super.default();
        pos.pockets = setup_1.Material.empty();
        return pos;
    }
    static fromSetup(setup) {
        return super.fromSetup(setup).map(pos => {
            pos.pockets = setup.pockets ? setup.pockets.clone() : setup_1.Material.empty();
            return pos;
        });
    }
    validate() {
        return super.validate().chain(_ => {
            if (this.pockets && (this.pockets.white.king > 0 || this.pockets.black.king > 0)) {
                return result_1.Result.err(new chess_1.PositionError(chess_1.IllegalSetup.Kings));
            }
            if ((this.pockets ? this.pockets.count() : 0) + this.board.occupied.size() > 64) {
                return result_1.Result.err(new chess_1.PositionError(chess_1.IllegalSetup.Variant));
            }
            return result_1.Result.ok(undefined);
        });
    }
    clone() {
        return super.clone();
    }
    hasInsufficientMaterial(color) {
        // No material can leave the game, but we can easily check this for
        // custom positions.
        if (!this.pockets)
            return super.hasInsufficientMaterial(color);
        return this.board.occupied.size() + this.pockets.count() <= 3 &&
            this.board.pawn.isEmpty() &&
            this.board.promoted.isEmpty() &&
            this.board.rooksAndQueens().isEmpty() &&
            this.pockets.white.pawn <= 0 &&
            this.pockets.black.pawn <= 0 &&
            this.pockets.white.rook <= 0 &&
            this.pockets.black.rook <= 0 &&
            this.pockets.white.queen <= 0 &&
            this.pockets.black.queen <= 0;
    }
    dropDests(ctx) {
        const mask = this.board.occupied.complement().intersect((this.pockets && this.pockets[this.turn].hasNonPawns()) ? squareSet_1.SquareSet.full() :
            (this.pockets && this.pockets[this.turn].pawn) ? squareSet_1.SquareSet.backranks().complement() :
                squareSet_1.SquareSet.empty());
        if (util_1.defined(ctx.king) && ctx.checkers.nonEmpty()) {
            const checker = ctx.checkers.singleSquare();
            if (!util_1.defined(checker))
                return squareSet_1.SquareSet.empty();
            return mask.intersect(attacks_1.between(checker, ctx.king));
        }
        else
            return mask;
    }
}
exports.Crazyhouse = Crazyhouse;
class Atomic extends chess_1.Chess {
    constructor() {
        super('atomic');
    }
    static default() {
        return super.default();
    }
    static fromSetup(setup) {
        return super.fromSetup(setup);
    }
    clone() {
        return super.clone();
    }
    validate() {
        // Like chess, but allow our king to be missing.
        if (this.board.occupied.isEmpty())
            return result_1.Result.err(new chess_1.PositionError(chess_1.IllegalSetup.Empty));
        if (this.board.king.size() > 2)
            return result_1.Result.err(new chess_1.PositionError(chess_1.IllegalSetup.Kings));
        const otherKing = this.board.kingOf(util_1.opposite(this.turn));
        if (!util_1.defined(otherKing))
            return result_1.Result.err(new chess_1.PositionError(chess_1.IllegalSetup.Kings));
        if (this.kingAttackers(otherKing, this.turn, this.board.occupied).nonEmpty()) {
            return result_1.Result.err(new chess_1.PositionError(chess_1.IllegalSetup.OppositeCheck));
        }
        if (squareSet_1.SquareSet.backranks().intersects(this.board.pawn)) {
            return result_1.Result.err(new chess_1.PositionError(chess_1.IllegalSetup.PawnsOnBackrank));
        }
        return result_1.Result.ok(undefined);
    }
    kingAttackers(square, attacker, occupied) {
        if (attacks_1.kingAttacks(square).intersects(this.board.pieces(attacker, 'king'))) {
            return squareSet_1.SquareSet.empty();
        }
        return super.kingAttackers(square, attacker, occupied);
    }
    playCaptureAt(square, captured) {
        super.playCaptureAt(square, captured);
        this.board.take(square);
        for (const explode of attacks_1.kingAttacks(square).intersect(this.board.occupied).diff(this.board.pawn)) {
            const piece = this.board.take(explode);
            if (piece && piece.role === 'rook')
                this.castles.discardRook(explode);
            if (piece && piece.role === 'king')
                this.castles.discardSide(piece.color);
        }
    }
    hasInsufficientMaterial(color) {
        // Remaining material does not matter if the enemy king is already
        // exploded.
        if (this.board.pieces(util_1.opposite(color), 'king').isEmpty())
            return false;
        // Bare king cannot mate.
        if (this.board[color].diff(this.board.king).isEmpty())
            return true;
        // As long as the enemy king is not alone, there is always a chance their
        // own pieces explode next to it.
        if (this.board[util_1.opposite(color)].diff(this.board.king).nonEmpty()) {
            // Unless there are only bishops that cannot explode each other.
            if (this.board.occupied.equals(this.board.bishop.union(this.board.king))) {
                if (!this.board.bishop.intersect(this.board.white).intersects(squareSet_1.SquareSet.darkSquares())) {
                    return !this.board.bishop.intersect(this.board.black).intersects(squareSet_1.SquareSet.lightSquares());
                }
                if (!this.board.bishop.intersect(this.board.white).intersects(squareSet_1.SquareSet.lightSquares())) {
                    return !this.board.bishop.intersect(this.board.black).intersects(squareSet_1.SquareSet.darkSquares());
                }
            }
            return false;
        }
        // Queen or pawn (future queen) can give mate against bare king.
        if (this.board.queen.nonEmpty() || this.board.pawn.nonEmpty())
            return false;
        // Single knight, bishop or rook cannot mate against bare king.
        if (this.board.knight.union(this.board.bishop).union(this.board.rook).isSingleSquare())
            return true;
        // If only knights, more than two are required to mate bare king.
        if (this.board.occupied.equals(this.board.knight.union(this.board.king))) {
            return this.board.knight.size() <= 2;
        }
        return false;
    }
    dests(square, ctx) {
        let dests = squareSet_1.SquareSet.empty();
        for (const to of this.pseudoDests(square, ctx)) {
            const after = this.clone();
            after.play({ from: square, to });
            const ourKing = after.board.kingOf(this.turn);
            if (util_1.defined(ourKing) && (!util_1.defined(after.board.kingOf(after.turn)) || after.kingAttackers(ourKing, after.turn, after.board.occupied).isEmpty())) {
                dests = dests.with(to);
            }
        }
        return dests;
    }
    isVariantEnd() {
        return !!this.variantOutcome();
    }
    variantOutcome() {
        for (const color of types_1.COLORS) {
            if (this.board.pieces(color, 'king').isEmpty())
                return { winner: util_1.opposite(color) };
        }
        return;
    }
}
exports.Atomic = Atomic;
class Antichess extends chess_1.Chess {
    constructor() {
        super('antichess');
    }
    static default() {
        const pos = new this();
        pos.board = board_1.Board.default();
        pos.turn = 'white';
        pos.castles = chess_1.Castles.empty();
        pos.epSquare = undefined;
        pos.remainingChecks = undefined;
        pos.halfmoves = 0;
        pos.fullmoves = 1;
        return pos;
    }
    static fromSetup(setup) {
        return super.fromSetup(setup).map(pos => {
            pos.castles = chess_1.Castles.empty();
            return pos;
        });
    }
    clone() {
        return super.clone();
    }
    validate() {
        if (this.board.occupied.isEmpty())
            return result_1.Result.err(new chess_1.PositionError(chess_1.IllegalSetup.Empty));
        if (squareSet_1.SquareSet.backranks().intersects(this.board.pawn))
            return result_1.Result.err(new chess_1.PositionError(chess_1.IllegalSetup.PawnsOnBackrank));
        return result_1.Result.ok(undefined);
    }
    kingAttackers(_square, _attacker, _occupied) {
        return squareSet_1.SquareSet.empty();
    }
    ctx() {
        const ctx = super.ctx();
        const enemy = this.board[util_1.opposite(this.turn)];
        for (const from of this.board[this.turn]) {
            if (this.pseudoDests(from, ctx).intersects(enemy)) {
                ctx.mustCapture = true;
                break;
            }
        }
        return ctx;
    }
    dests(square, ctx) {
        const dests = this.pseudoDests(square, ctx);
        if (!ctx.mustCapture)
            return dests;
        else
            return dests.intersect(this.board[util_1.opposite(this.turn)]);
    }
    hasInsufficientMaterial(color) {
        if (this.board.occupied.equals(this.board.bishop)) {
            const weSomeOnLight = this.board[color].intersects(squareSet_1.SquareSet.lightSquares());
            const weSomeOnDark = this.board[color].intersects(squareSet_1.SquareSet.darkSquares());
            const theyAllOnDark = this.board[util_1.opposite(color)].isDisjoint(squareSet_1.SquareSet.lightSquares());
            const theyAllOnLight = this.board[util_1.opposite(color)].isDisjoint(squareSet_1.SquareSet.darkSquares());
            return (weSomeOnLight && theyAllOnDark) || (weSomeOnDark && theyAllOnLight);
        }
        return false;
    }
    isVariantEnd() {
        return this.board[this.turn].isEmpty();
    }
    variantOutcome() {
        if (this.isVariantEnd() || this.isStalemate()) {
            return { winner: this.turn };
        }
        return;
    }
}
exports.Antichess = Antichess;
class KingOfTheHill extends chess_1.Chess {
    constructor() {
        super('kingofthehill');
    }
    static default() {
        return super.default();
    }
    static fromSetup(setup) {
        return super.fromSetup(setup);
    }
    clone() {
        return super.clone();
    }
    hasInsufficientMaterial(_color) {
        return false;
    }
    isVariantEnd() {
        return this.board.king.intersects(squareSet_1.SquareSet.center());
    }
    variantOutcome() {
        for (const color of types_1.COLORS) {
            if (this.board.pieces(color, 'king').intersects(squareSet_1.SquareSet.center()))
                return { winner: color };
        }
        return;
    }
}
exports.KingOfTheHill = KingOfTheHill;
class ThreeCheck extends chess_1.Chess {
    constructor() {
        super('3check');
    }
    static default() {
        const pos = super.default();
        pos.remainingChecks = setup_1.RemainingChecks.default();
        return pos;
    }
    static fromSetup(setup) {
        return super.fromSetup(setup).map(pos => {
            pos.remainingChecks = setup.remainingChecks ? setup.remainingChecks.clone() : setup_1.RemainingChecks.default();
            return pos;
        });
    }
    clone() {
        return super.clone();
    }
    hasInsufficientMaterial(color) {
        return this.board.pieces(color, 'king').equals(this.board[color]);
    }
    isVariantEnd() {
        return !!this.remainingChecks && (this.remainingChecks.white <= 0 || this.remainingChecks.black <= 0);
    }
    variantOutcome() {
        if (this.remainingChecks) {
            for (const color of types_1.COLORS) {
                if (this.remainingChecks[color] <= 0)
                    return { winner: color };
            }
        }
        return;
    }
}
exports.ThreeCheck = ThreeCheck;
class RacingKings extends chess_1.Chess {
    constructor() {
        super('racingkings');
    }
    static default() {
        const pos = new this();
        pos.board = board_1.Board.racingKings();
        pos.turn = 'white';
        pos.castles = chess_1.Castles.empty();
        pos.epSquare = undefined;
        pos.remainingChecks = undefined;
        pos.halfmoves = 0;
        pos.fullmoves = 1;
        return pos;
    }
    static fromSetup(setup) {
        return super.fromSetup(setup).map(pos => {
            pos.castles = chess_1.Castles.empty();
            return pos;
        });
    }
    validate() {
        if (this.board.pawn.nonEmpty() || this.isCheck()) {
            return result_1.Result.err(new chess_1.PositionError(chess_1.IllegalSetup.Variant));
        }
        return super.validate();
    }
    clone() {
        return super.clone();
    }
    dests(square, ctx) {
        // Kings cannot give check.
        if (square === ctx.king)
            return super.dests(square, ctx);
        // TODO: This could be optimized considerably.
        let dests = squareSet_1.SquareSet.empty();
        for (const to of super.dests(square, ctx)) {
            // Valid, because there are no promotions (or even pawns).
            const uci = { from: square, to };
            const after = this.clone();
            after.play(uci);
            if (!after.isCheck())
                dests = dests.with(to);
        }
        return dests;
    }
    hasInsufficientMaterial(_color) {
        return false;
    }
    isVariantEnd() {
        const goal = squareSet_1.SquareSet.fromRank(7);
        const inGoal = this.board.king.intersect(goal);
        if (inGoal.isEmpty())
            return false;
        if (this.turn === 'white' || inGoal.intersects(this.board.black))
            return true;
        // White has reached the backrank. Check if black can catch up.
        const blackKing = this.board.kingOf('black');
        if (util_1.defined(blackKing)) {
            const occ = this.board.occupied.without(blackKing);
            for (const target of attacks_1.kingAttacks(blackKing).intersect(goal).diff(this.board.black)) {
                if (this.kingAttackers(target, util_1.opposite(this.turn), occ).isEmpty())
                    return false;
            }
        }
        return true;
    }
    variantOutcome() {
        if (!this.isVariantEnd())
            return;
        const goal = squareSet_1.SquareSet.fromRank(7);
        const blackInGoal = this.board.pieces('black', 'king').intersects(goal);
        const whiteInGoal = this.board.pieces('white', 'king').intersects(goal);
        if (blackInGoal && !whiteInGoal)
            return { winner: 'black' };
        if (whiteInGoal && !blackInGoal)
            return { winner: 'white' };
        return { winner: undefined };
    }
}
class Horde extends chess_1.Chess {
    constructor() {
        super('horde');
    }
    static default() {
        const pos = new this();
        pos.board = board_1.Board.horde();
        pos.pockets = undefined;
        pos.turn = 'white';
        pos.castles = chess_1.Castles.default();
        pos.castles.discardSide('white');
        pos.epSquare = undefined;
        pos.remainingChecks = undefined;
        pos.halfmoves = 0;
        pos.fullmoves = 1;
        return pos;
    }
    static fromSetup(setup) {
        return super.fromSetup(setup);
    }
    validate() {
        if (this.board.occupied.isEmpty())
            return result_1.Result.err(new chess_1.PositionError(chess_1.IllegalSetup.Empty));
        if (!this.board.king.isSingleSquare())
            return result_1.Result.err(new chess_1.PositionError(chess_1.IllegalSetup.Kings));
        if (!this.board.king.diff(this.board.promoted).isSingleSquare())
            return result_1.Result.err(new chess_1.PositionError(chess_1.IllegalSetup.Kings));
        const otherKing = this.board.kingOf(util_1.opposite(this.turn));
        if (util_1.defined(otherKing) && this.kingAttackers(otherKing, this.turn, this.board.occupied).nonEmpty())
            return result_1.Result.err(new chess_1.PositionError(chess_1.IllegalSetup.OppositeCheck));
        for (const color of types_1.COLORS) {
            if (this.board.pieces(color, 'pawn').intersects(squareSet_1.SquareSet.backrank(util_1.opposite(color)))) {
                return result_1.Result.err(new chess_1.PositionError(chess_1.IllegalSetup.PawnsOnBackrank));
            }
        }
        return result_1.Result.ok(undefined);
    }
    clone() {
        return super.clone();
    }
    hasInsufficientMaterial(_color) {
        // TODO: Could detect cases where the horde cannot mate.
        return false;
    }
    isVariantEnd() {
        return this.board.white.isEmpty() || this.board.black.isEmpty();
    }
    variantOutcome() {
        if (this.board.white.isEmpty())
            return { winner: 'black' };
        if (this.board.black.isEmpty())
            return { winner: 'white' };
        return;
    }
}
exports.Horde = Horde;
function defaultPosition(rules) {
    switch (rules) {
        case 'chess': return chess_1.Chess.default();
        case 'antichess': return Antichess.default();
        case 'atomic': return Atomic.default();
        case 'horde': return Horde.default();
        case 'racingkings': return RacingKings.default();
        case 'kingofthehill': return KingOfTheHill.default();
        case '3check': return ThreeCheck.default();
        case 'crazyhouse': return Crazyhouse.default();
    }
}
exports.defaultPosition = defaultPosition;
function setupPosition(rules, setup) {
    switch (rules) {
        case 'chess': return chess_1.Chess.fromSetup(setup);
        case 'antichess': return Antichess.fromSetup(setup);
        case 'atomic': return Atomic.fromSetup(setup);
        case 'horde': return Horde.fromSetup(setup);
        case 'racingkings': return RacingKings.fromSetup(setup);
        case 'kingofthehill': return KingOfTheHill.fromSetup(setup);
        case '3check': return ThreeCheck.fromSetup(setup);
        case 'crazyhouse': return Crazyhouse.fromSetup(setup);
    }
}
exports.setupPosition = setupPosition;

},{"./attacks":20,"./board":21,"./chess":22,"./setup":25,"./squareSet":26,"./types":27,"./util":28,"@badrap/result":1}],30:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vnode_1 = require("./vnode");
var is = require("./is");
function addNS(data, children, sel) {
    data.ns = 'http://www.w3.org/2000/svg';
    if (sel !== 'foreignObject' && children !== undefined) {
        for (var i = 0; i < children.length; ++i) {
            var childData = children[i].data;
            if (childData !== undefined) {
                addNS(childData, children[i].children, children[i].sel);
            }
        }
    }
}
function h(sel, b, c) {
    var data = {}, children, text, i;
    if (c !== undefined) {
        data = b;
        if (is.array(c)) {
            children = c;
        }
        else if (is.primitive(c)) {
            text = c;
        }
        else if (c && c.sel) {
            children = [c];
        }
    }
    else if (b !== undefined) {
        if (is.array(b)) {
            children = b;
        }
        else if (is.primitive(b)) {
            text = b;
        }
        else if (b && b.sel) {
            children = [b];
        }
        else {
            data = b;
        }
    }
    if (is.array(children)) {
        for (i = 0; i < children.length; ++i) {
            if (is.primitive(children[i]))
                children[i] = vnode_1.vnode(undefined, undefined, undefined, children[i]);
        }
    }
    if (sel[0] === 's' && sel[1] === 'v' && sel[2] === 'g' &&
        (sel.length === 3 || sel[3] === '.' || sel[3] === '#')) {
        addNS(data, children, sel);
    }
    return vnode_1.vnode(sel, data, children, text, undefined);
}
exports.h = h;
;
exports.default = h;

},{"./is":32,"./vnode":37}],31:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function createElement(tagName) {
    return document.createElement(tagName);
}
function createElementNS(namespaceURI, qualifiedName) {
    return document.createElementNS(namespaceURI, qualifiedName);
}
function createTextNode(text) {
    return document.createTextNode(text);
}
function insertBefore(parentNode, newNode, referenceNode) {
    parentNode.insertBefore(newNode, referenceNode);
}
function removeChild(node, child) {
    node.removeChild(child);
}
function appendChild(node, child) {
    node.appendChild(child);
}
function parentNode(node) {
    return node.parentNode;
}
function nextSibling(node) {
    return node.nextSibling;
}
function tagName(elm) {
    return elm.tagName;
}
function setTextContent(node, text) {
    node.textContent = text;
}
function getTextContent(node) {
    return node.textContent;
}
function isElement(node) {
    return node.nodeType === 1;
}
function isText(node) {
    return node.nodeType === 3;
}
exports.htmlDomApi = {
    createElement: createElement,
    createElementNS: createElementNS,
    createTextNode: createTextNode,
    insertBefore: insertBefore,
    removeChild: removeChild,
    appendChild: appendChild,
    parentNode: parentNode,
    nextSibling: nextSibling,
    tagName: tagName,
    setTextContent: setTextContent,
    getTextContent: getTextContent,
    isElement: isElement,
    isText: isText,
};
exports.default = exports.htmlDomApi;

},{}],32:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.array = Array.isArray;
function primitive(s) {
    return typeof s === 'string' || typeof s === 'number';
}
exports.primitive = primitive;

},{}],33:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function updateAttrs(oldVnode, vnode) {
    var key, elm = vnode.elm, oldAttrs = oldVnode.data.attrs, attrs = vnode.data.attrs;
    if (!oldAttrs && !attrs)
        return;
    if (oldAttrs === attrs)
        return;
    oldAttrs = oldAttrs || {};
    attrs = attrs || {};
    // update modified attributes, add new attributes
    for (key in attrs) {
        var cur = attrs[key];
        var old = oldAttrs[key];
        if (old !== cur) {
            if (cur === true) {
                elm.setAttribute(key, "");
            }
            else if (cur === false) {
                elm.removeAttribute(key);
            }
            else {
                elm.setAttribute(key, cur);
            }
        }
    }
    // remove removed attributes
    // use `in` operator since the previous `for` iteration uses it (.i.e. add even attributes with undefined value)
    // the other option is to remove all attributes with value == undefined
    for (key in oldAttrs) {
        if (!(key in attrs)) {
            elm.removeAttribute(key);
        }
    }
}
exports.attributesModule = { create: updateAttrs, update: updateAttrs };
exports.default = exports.attributesModule;

},{}],34:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function updateClass(oldVnode, vnode) {
    var cur, name, elm = vnode.elm, oldClass = oldVnode.data.class, klass = vnode.data.class;
    if (!oldClass && !klass)
        return;
    if (oldClass === klass)
        return;
    oldClass = oldClass || {};
    klass = klass || {};
    for (name in oldClass) {
        if (!klass[name]) {
            elm.classList.remove(name);
        }
    }
    for (name in klass) {
        cur = klass[name];
        if (cur !== oldClass[name]) {
            elm.classList[cur ? 'add' : 'remove'](name);
        }
    }
}
exports.classModule = { create: updateClass, update: updateClass };
exports.default = exports.classModule;

},{}],35:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vnode_1 = require("./vnode");
var is = require("./is");
var htmldomapi_1 = require("./htmldomapi");
function isUndef(s) { return s === undefined; }
function isDef(s) { return s !== undefined; }
var emptyNode = vnode_1.default('', {}, [], undefined, undefined);
function sameVnode(vnode1, vnode2) {
    return vnode1.key === vnode2.key && vnode1.sel === vnode2.sel;
}
function isVnode(vnode) {
    return vnode.sel !== undefined;
}
function createKeyToOldIdx(children, beginIdx, endIdx) {
    var i, map = {}, key, ch;
    for (i = beginIdx; i <= endIdx; ++i) {
        ch = children[i];
        if (ch != null) {
            key = ch.key;
            if (key !== undefined)
                map[key] = i;
        }
    }
    return map;
}
var hooks = ['create', 'update', 'remove', 'destroy', 'pre', 'post'];
var h_1 = require("./h");
exports.h = h_1.h;
var thunk_1 = require("./thunk");
exports.thunk = thunk_1.thunk;
function init(modules, domApi) {
    var i, j, cbs = {};
    var api = domApi !== undefined ? domApi : htmldomapi_1.default;
    for (i = 0; i < hooks.length; ++i) {
        cbs[hooks[i]] = [];
        for (j = 0; j < modules.length; ++j) {
            var hook = modules[j][hooks[i]];
            if (hook !== undefined) {
                cbs[hooks[i]].push(hook);
            }
        }
    }
    function emptyNodeAt(elm) {
        var id = elm.id ? '#' + elm.id : '';
        var c = elm.className ? '.' + elm.className.split(' ').join('.') : '';
        return vnode_1.default(api.tagName(elm).toLowerCase() + id + c, {}, [], undefined, elm);
    }
    function createRmCb(childElm, listeners) {
        return function rmCb() {
            if (--listeners === 0) {
                var parent_1 = api.parentNode(childElm);
                api.removeChild(parent_1, childElm);
            }
        };
    }
    function createElm(vnode, insertedVnodeQueue) {
        var i, data = vnode.data;
        if (data !== undefined) {
            if (isDef(i = data.hook) && isDef(i = i.init)) {
                i(vnode);
                data = vnode.data;
            }
        }
        var children = vnode.children, sel = vnode.sel;
        if (sel !== undefined) {
            // Parse selector
            var hashIdx = sel.indexOf('#');
            var dotIdx = sel.indexOf('.', hashIdx);
            var hash = hashIdx > 0 ? hashIdx : sel.length;
            var dot = dotIdx > 0 ? dotIdx : sel.length;
            var tag = hashIdx !== -1 || dotIdx !== -1 ? sel.slice(0, Math.min(hash, dot)) : sel;
            var elm = vnode.elm = isDef(data) && isDef(i = data.ns) ? api.createElementNS(i, tag)
                : api.createElement(tag);
            if (hash < dot)
                elm.setAttribute('id', sel.slice(hash + 1, dot));
            if (dotIdx > 0)
                elm.setAttribute('class', sel.slice(dot + 1).replace(/\./g, ' '));
            for (i = 0; i < cbs.create.length; ++i)
                cbs.create[i](emptyNode, vnode);
            if (is.array(children)) {
                for (i = 0; i < children.length; ++i) {
                    var ch = children[i];
                    if (ch != null) {
                        api.appendChild(elm, createElm(ch, insertedVnodeQueue));
                    }
                }
            }
            else if (is.primitive(vnode.text)) {
                api.appendChild(elm, api.createTextNode(vnode.text));
            }
            i = vnode.data.hook; // Reuse variable
            if (isDef(i)) {
                if (i.create)
                    i.create(emptyNode, vnode);
                if (i.insert)
                    insertedVnodeQueue.push(vnode);
            }
        }
        else {
            vnode.elm = api.createTextNode(vnode.text);
        }
        return vnode.elm;
    }
    function addVnodes(parentElm, before, vnodes, startIdx, endIdx, insertedVnodeQueue) {
        for (; startIdx <= endIdx; ++startIdx) {
            var ch = vnodes[startIdx];
            if (ch != null) {
                api.insertBefore(parentElm, createElm(ch, insertedVnodeQueue), before);
            }
        }
    }
    function invokeDestroyHook(vnode) {
        var i, j, data = vnode.data;
        if (data !== undefined) {
            if (isDef(i = data.hook) && isDef(i = i.destroy))
                i(vnode);
            for (i = 0; i < cbs.destroy.length; ++i)
                cbs.destroy[i](vnode);
            if (vnode.children !== undefined) {
                for (j = 0; j < vnode.children.length; ++j) {
                    i = vnode.children[j];
                    if (i != null && typeof i !== "string") {
                        invokeDestroyHook(i);
                    }
                }
            }
        }
    }
    function removeVnodes(parentElm, vnodes, startIdx, endIdx) {
        for (; startIdx <= endIdx; ++startIdx) {
            var i_1 = void 0, listeners = void 0, rm = void 0, ch = vnodes[startIdx];
            if (ch != null) {
                if (isDef(ch.sel)) {
                    invokeDestroyHook(ch);
                    listeners = cbs.remove.length + 1;
                    rm = createRmCb(ch.elm, listeners);
                    for (i_1 = 0; i_1 < cbs.remove.length; ++i_1)
                        cbs.remove[i_1](ch, rm);
                    if (isDef(i_1 = ch.data) && isDef(i_1 = i_1.hook) && isDef(i_1 = i_1.remove)) {
                        i_1(ch, rm);
                    }
                    else {
                        rm();
                    }
                }
                else {
                    api.removeChild(parentElm, ch.elm);
                }
            }
        }
    }
    function updateChildren(parentElm, oldCh, newCh, insertedVnodeQueue) {
        var oldStartIdx = 0, newStartIdx = 0;
        var oldEndIdx = oldCh.length - 1;
        var oldStartVnode = oldCh[0];
        var oldEndVnode = oldCh[oldEndIdx];
        var newEndIdx = newCh.length - 1;
        var newStartVnode = newCh[0];
        var newEndVnode = newCh[newEndIdx];
        var oldKeyToIdx;
        var idxInOld;
        var elmToMove;
        var before;
        while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
            if (oldStartVnode == null) {
                oldStartVnode = oldCh[++oldStartIdx]; // Vnode might have been moved left
            }
            else if (oldEndVnode == null) {
                oldEndVnode = oldCh[--oldEndIdx];
            }
            else if (newStartVnode == null) {
                newStartVnode = newCh[++newStartIdx];
            }
            else if (newEndVnode == null) {
                newEndVnode = newCh[--newEndIdx];
            }
            else if (sameVnode(oldStartVnode, newStartVnode)) {
                patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue);
                oldStartVnode = oldCh[++oldStartIdx];
                newStartVnode = newCh[++newStartIdx];
            }
            else if (sameVnode(oldEndVnode, newEndVnode)) {
                patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue);
                oldEndVnode = oldCh[--oldEndIdx];
                newEndVnode = newCh[--newEndIdx];
            }
            else if (sameVnode(oldStartVnode, newEndVnode)) {
                patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue);
                api.insertBefore(parentElm, oldStartVnode.elm, api.nextSibling(oldEndVnode.elm));
                oldStartVnode = oldCh[++oldStartIdx];
                newEndVnode = newCh[--newEndIdx];
            }
            else if (sameVnode(oldEndVnode, newStartVnode)) {
                patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue);
                api.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm);
                oldEndVnode = oldCh[--oldEndIdx];
                newStartVnode = newCh[++newStartIdx];
            }
            else {
                if (oldKeyToIdx === undefined) {
                    oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx);
                }
                idxInOld = oldKeyToIdx[newStartVnode.key];
                if (isUndef(idxInOld)) {
                    api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm);
                    newStartVnode = newCh[++newStartIdx];
                }
                else {
                    elmToMove = oldCh[idxInOld];
                    if (elmToMove.sel !== newStartVnode.sel) {
                        api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm);
                    }
                    else {
                        patchVnode(elmToMove, newStartVnode, insertedVnodeQueue);
                        oldCh[idxInOld] = undefined;
                        api.insertBefore(parentElm, elmToMove.elm, oldStartVnode.elm);
                    }
                    newStartVnode = newCh[++newStartIdx];
                }
            }
        }
        if (oldStartIdx > oldEndIdx) {
            before = newCh[newEndIdx + 1] == null ? null : newCh[newEndIdx + 1].elm;
            addVnodes(parentElm, before, newCh, newStartIdx, newEndIdx, insertedVnodeQueue);
        }
        else if (newStartIdx > newEndIdx) {
            removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx);
        }
    }
    function patchVnode(oldVnode, vnode, insertedVnodeQueue) {
        var i, hook;
        if (isDef(i = vnode.data) && isDef(hook = i.hook) && isDef(i = hook.prepatch)) {
            i(oldVnode, vnode);
        }
        var elm = vnode.elm = oldVnode.elm;
        var oldCh = oldVnode.children;
        var ch = vnode.children;
        if (oldVnode === vnode)
            return;
        if (vnode.data !== undefined) {
            for (i = 0; i < cbs.update.length; ++i)
                cbs.update[i](oldVnode, vnode);
            i = vnode.data.hook;
            if (isDef(i) && isDef(i = i.update))
                i(oldVnode, vnode);
        }
        if (isUndef(vnode.text)) {
            if (isDef(oldCh) && isDef(ch)) {
                if (oldCh !== ch)
                    updateChildren(elm, oldCh, ch, insertedVnodeQueue);
            }
            else if (isDef(ch)) {
                if (isDef(oldVnode.text))
                    api.setTextContent(elm, '');
                addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue);
            }
            else if (isDef(oldCh)) {
                removeVnodes(elm, oldCh, 0, oldCh.length - 1);
            }
            else if (isDef(oldVnode.text)) {
                api.setTextContent(elm, '');
            }
        }
        else if (oldVnode.text !== vnode.text) {
            api.setTextContent(elm, vnode.text);
        }
        if (isDef(hook) && isDef(i = hook.postpatch)) {
            i(oldVnode, vnode);
        }
    }
    return function patch(oldVnode, vnode) {
        var i, elm, parent;
        var insertedVnodeQueue = [];
        for (i = 0; i < cbs.pre.length; ++i)
            cbs.pre[i]();
        if (!isVnode(oldVnode)) {
            oldVnode = emptyNodeAt(oldVnode);
        }
        if (sameVnode(oldVnode, vnode)) {
            patchVnode(oldVnode, vnode, insertedVnodeQueue);
        }
        else {
            elm = oldVnode.elm;
            parent = api.parentNode(elm);
            createElm(vnode, insertedVnodeQueue);
            if (parent !== null) {
                api.insertBefore(parent, vnode.elm, api.nextSibling(elm));
                removeVnodes(parent, [oldVnode], 0, 0);
            }
        }
        for (i = 0; i < insertedVnodeQueue.length; ++i) {
            insertedVnodeQueue[i].data.hook.insert(insertedVnodeQueue[i]);
        }
        for (i = 0; i < cbs.post.length; ++i)
            cbs.post[i]();
        return vnode;
    };
}
exports.init = init;

},{"./h":30,"./htmldomapi":31,"./is":32,"./thunk":36,"./vnode":37}],36:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var h_1 = require("./h");
function copyToThunk(vnode, thunk) {
    thunk.elm = vnode.elm;
    vnode.data.fn = thunk.data.fn;
    vnode.data.args = thunk.data.args;
    thunk.data = vnode.data;
    thunk.children = vnode.children;
    thunk.text = vnode.text;
    thunk.elm = vnode.elm;
}
function init(thunk) {
    var cur = thunk.data;
    var vnode = cur.fn.apply(undefined, cur.args);
    copyToThunk(vnode, thunk);
}
function prepatch(oldVnode, thunk) {
    var i, old = oldVnode.data, cur = thunk.data;
    var oldArgs = old.args, args = cur.args;
    if (old.fn !== cur.fn || oldArgs.length !== args.length) {
        copyToThunk(cur.fn.apply(undefined, args), thunk);
        return;
    }
    for (i = 0; i < args.length; ++i) {
        if (oldArgs[i] !== args[i]) {
            copyToThunk(cur.fn.apply(undefined, args), thunk);
            return;
        }
    }
    copyToThunk(oldVnode, thunk);
}
exports.thunk = function thunk(sel, key, fn, args) {
    if (args === undefined) {
        args = fn;
        fn = key;
        key = undefined;
    }
    return h_1.h(sel, {
        key: key,
        hook: { init: init, prepatch: prepatch },
        fn: fn,
        args: args
    });
};
exports.default = exports.thunk;

},{"./h":30}],37:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function vnode(sel, data, children, text, elm) {
    var key = data === undefined ? undefined : data.key;
    return { sel: sel, data: data, children: children,
        text: text, elm: elm, key: key };
}
exports.vnode = vnode;
exports.default = vnode;

},{}],38:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const studyChapters_1 = require("./study/studyChapters");
const game = require("game");
const common_1 = require("common");
const util_1 = require("./util");
function renderRatingDiff(rd) {
    if (rd === 0)
        return snabbdom_1.h('span', '±0');
    if (rd && rd > 0)
        return snabbdom_1.h('good', '+' + rd);
    if (rd && rd < 0)
        return snabbdom_1.h('bad', '−' + (-rd));
    return;
}
function renderPlayer(ctrl, color) {
    const p = game.getPlayer(ctrl.data, color);
    if (p.user)
        return snabbdom_1.h('a.user-link.ulpt', {
            attrs: { href: '/@/' + p.user.username }
        }, [
            p.user.username, ' ',
            renderRatingDiff(p.ratingDiff)
        ]);
    return snabbdom_1.h('span', p.name ||
        (p.ai && 'Stockfish level ' + p.ai) ||
        (ctrl.study && studyChapters_1.findTag(ctrl.study.data.chapter.tags, color)) ||
        'Anonymous');
}
const advices = [
    ['inaccuracy', 'inaccuracies', '?!'],
    ['mistake', 'mistakes', '?'],
    ['blunder', 'blunders', '??']
];
function playerTable(ctrl, color) {
    const d = ctrl.data, trans = ctrl.trans.noarg;
    const acpl = d.analysis[color].acpl;
    return snabbdom_1.h('table', {
        hook: {
            insert(vnode) {
                window.lichess.powertip.manualUserIn(vnode.elm);
            }
        }
    }, [
        snabbdom_1.h('thead', snabbdom_1.h('tr', [
            snabbdom_1.h('td', snabbdom_1.h('i.is.color-icon.' + color)),
            snabbdom_1.h('th', renderPlayer(ctrl, color))
        ])),
        snabbdom_1.h('tbody', advices.map(a => {
            const nb = d.analysis[color][a[0]];
            const attrs = nb ? {
                'data-color': color,
                'data-symbol': a[2]
            } : {};
            return snabbdom_1.h('tr' + (nb ? '.symbol' : ''), { attrs }, [
                snabbdom_1.h('td', '' + nb),
                snabbdom_1.h('th', trans(a[1]))
            ]);
        }).concat(snabbdom_1.h('tr', [
            snabbdom_1.h('td', '' + (common_1.defined(acpl) ? acpl : '?')),
            snabbdom_1.h('th', trans('averageCentipawnLoss'))
        ])))
    ]);
}
function doRender(ctrl) {
    return snabbdom_1.h('div.advice-summary', {
        hook: {
            insert: vnode => {
                $(vnode.elm).on('click', 'tr.symbol', function () {
                    ctrl.jumpToGlyphSymbol($(this).data('color'), $(this).data('symbol'));
                });
            }
        }
    }, [
        playerTable(ctrl, 'white'),
        ctrl.study ? null : snabbdom_1.h('a.button.text', {
            class: { active: !!ctrl.retro },
            attrs: util_1.dataIcon('G'),
            hook: util_1.bind('click', ctrl.toggleRetro, ctrl.redraw)
        }, ctrl.trans.noarg('learnFromYourMistakes')),
        playerTable(ctrl, 'black')
    ]);
}
function render(ctrl) {
    if (ctrl.studyPractice || ctrl.embed)
        return;
    if (!ctrl.data.analysis || !ctrl.showComputer() || (ctrl.study && ctrl.study.vm.toolTab() !== 'serverEval'))
        return snabbdom_1.h('div.analyse__acpl');
    // don't cache until the analysis is complete!
    const buster = ctrl.data.analysis.partial ? Math.random() : '';
    let cacheKey = '' + buster + !!ctrl.retro;
    if (ctrl.study)
        cacheKey += ctrl.study.data.chapter.id;
    return snabbdom_1.h('div.analyse__acpl', snabbdom_1.thunk('div.advice-summary', doRender, [ctrl, cacheKey]));
}
exports.render = render;

},{"./study/studyChapters":95,"./util":110,"common":131,"game":138,"snabbdom":35}],39:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("common");
const snabbdom_1 = require("snabbdom");
const boolSetting_1 = require("./boolSetting");
const router_1 = require("game/router");
const util_1 = require("./util");
const pgnExport = require("./pgnExport");
const baseSpeeds = [{
        name: 'fast',
        delay: 1000
    }, {
        name: 'slow',
        delay: 5000
    }];
const realtimeSpeed = {
    name: 'realtimeReplay',
    delay: 'realtime'
};
const cplSpeed = {
    name: 'byCPL',
    delay: 'cpl'
};
function deleteButton(ctrl, userId) {
    const g = ctrl.data.game;
    if (g.source === 'import' &&
        g.importedBy && g.importedBy === userId)
        return snabbdom_1.h('form.delete', {
            attrs: {
                method: 'post',
                action: '/' + g.id + '/delete'
            },
            hook: util_1.bind('submit', _ => confirm(ctrl.trans.noarg('deleteThisImportedGame')))
        }, [
            snabbdom_1.h('button.button.text.thin', {
                attrs: {
                    type: 'submit',
                    'data-icon': 'q'
                }
            }, ctrl.trans.noarg('delete'))
        ]);
    return;
}
function autoplayButtons(ctrl) {
    const d = ctrl.data;
    const speeds = [
        ...baseSpeeds,
        ...(d.game.speed !== 'correspondence' && !common_1.empty(d.game.moveCentis) ? [realtimeSpeed] : []),
        ...(d.analysis ? [cplSpeed] : [])
    ];
    return snabbdom_1.h('div.autoplay', speeds.map(speed => {
        return snabbdom_1.h('a.button.button-empty', {
            hook: util_1.bind('click', () => ctrl.togglePlay(speed.delay), ctrl.redraw)
        }, ctrl.trans.noarg(speed.name));
    }));
}
function rangeConfig(read, write) {
    return {
        insert: vnode => {
            const el = vnode.elm;
            el.value = '' + read();
            el.addEventListener('input', _ => write(parseInt(el.value)));
            el.addEventListener('mouseout', _ => el.blur());
        }
    };
}
function formatHashSize(v) {
    if (v < 1000)
        return v + 'MB';
    else
        return Math.round(v / 1024) + 'GB';
}
function hiddenInput(name, value) {
    return snabbdom_1.h('input', {
        attrs: { 'type': 'hidden', name, value }
    });
}
function studyButton(ctrl) {
    if (ctrl.study && ctrl.embed && !ctrl.ongoing)
        return snabbdom_1.h('a.button.button-empty', {
            attrs: {
                href: '/study/' + ctrl.study.data.id + '#' + ctrl.study.currentChapter().id,
                target: '_blank',
                'data-icon': '4'
            }
        }, ctrl.trans.noarg('openStudy'));
    if (ctrl.study || ctrl.ongoing || ctrl.embed)
        return;
    return snabbdom_1.h('form', {
        attrs: {
            method: 'post',
            action: '/study/as'
        },
        hook: util_1.bind('submit', e => {
            const pgnInput = e.target.querySelector('input[name=pgn]');
            if (pgnInput)
                pgnInput.value = pgnExport.renderFullTxt(ctrl);
        })
    }, [
        !ctrl.synthetic ? hiddenInput('gameId', ctrl.data.game.id) : hiddenInput('pgn', ''),
        hiddenInput('orientation', ctrl.chessground.state.orientation),
        hiddenInput('variant', ctrl.data.game.variant.key),
        hiddenInput('fen', ctrl.tree.root.fen),
        snabbdom_1.h('button.button.button-empty', {
            attrs: {
                type: 'submit',
                'data-icon': '4'
            }
        }, ctrl.trans.noarg('toStudy'))
    ]);
}
class Ctrl {
    constructor() {
        this.open = false;
        this.toggle = () => this.open = !this.open;
    }
}
exports.Ctrl = Ctrl;
function view(ctrl) {
    const d = ctrl.data, noarg = ctrl.trans.noarg, canContinue = !ctrl.ongoing && !ctrl.embed && d.game.variant.key === 'standard', ceval = ctrl.getCeval(), mandatoryCeval = ctrl.mandatoryCeval();
    const tools = [
        snabbdom_1.h('div.action-menu__tools', [
            snabbdom_1.h('a.button.button-empty', {
                hook: util_1.bind('click', ctrl.flip),
                attrs: util_1.dataIcon('B')
            }, noarg('flipBoard')),
            ctrl.ongoing ? null : snabbdom_1.h('a.button.button-empty', {
                attrs: {
                    href: d.userAnalysis ? '/editor?fen=' + ctrl.node.fen : '/' + d.game.id + '/edit?fen=' + ctrl.node.fen,
                    rel: 'nofollow',
                    target: ctrl.embed ? '_blank' : '',
                    'data-icon': 'm'
                }
            }, noarg('boardEditor')),
            canContinue ? snabbdom_1.h('a.button.button-empty', {
                hook: util_1.bind('click', _ => $.modal($('.continue-with.g_' + d.game.id))),
                attrs: util_1.dataIcon('U')
            }, noarg('continueFromHere')) : null,
            studyButton(ctrl)
        ])
    ];
    const cevalConfig = (ceval && ceval.possible && ceval.allowed()) ? [
        snabbdom_1.h('h2', noarg('computerAnalysis'))
    ].concat([
        ctrlBoolSetting({
            name: 'enable',
            title: (mandatoryCeval ? "Required by practice mode" : window.lichess.engineName) + ' (Hotkey: z)',
            id: 'all',
            checked: ctrl.showComputer(),
            disabled: mandatoryCeval,
            change: ctrl.toggleComputer
        }, ctrl)
    ]).concat(ctrl.showComputer() ? [
        ctrlBoolSetting({
            name: 'bestMoveArrow',
            title: 'Hotkey: a',
            id: 'shapes',
            checked: ctrl.showAutoShapes(),
            change: ctrl.toggleAutoShapes
        }, ctrl),
        ctrlBoolSetting({
            name: 'evaluationGauge',
            id: 'gauge',
            checked: ctrl.showGauge(),
            change: ctrl.toggleGauge
        }, ctrl),
        ctrlBoolSetting({
            name: 'infiniteAnalysis',
            title: 'removesTheDepthLimit',
            id: 'infinite',
            checked: ceval.infinite(),
            change: ctrl.cevalSetInfinite
        }, ctrl),
        (id => {
            const max = 5;
            return snabbdom_1.h('div.setting', [
                snabbdom_1.h('label', { attrs: { 'for': id } }, noarg('multipleLines')),
                snabbdom_1.h('input#' + id, {
                    attrs: {
                        type: 'range',
                        min: 1,
                        max,
                        step: 1
                    },
                    hook: rangeConfig(() => parseInt(ceval.multiPv()), ctrl.cevalSetMultiPv)
                }),
                snabbdom_1.h('div.range_value', ceval.multiPv() + ' / ' + max)
            ]);
        })('analyse-multipv'),
        ceval.threads ? (id => {
            return snabbdom_1.h('div.setting', [
                snabbdom_1.h('label', { attrs: { 'for': id } }, noarg('cpus')),
                snabbdom_1.h('input#' + id, {
                    attrs: {
                        type: 'range',
                        min: 1,
                        max: ceval.maxThreads,
                        step: 1
                    },
                    hook: rangeConfig(() => parseInt(ceval.threads()), ctrl.cevalSetThreads)
                }),
                snabbdom_1.h('div.range_value', `${ceval.threads()} / ${ceval.maxThreads}`)
            ]);
        })('analyse-threads') : null,
        ceval.hashSize ? (id => snabbdom_1.h('div.setting', [
            snabbdom_1.h('label', { attrs: { 'for': id } }, noarg('memory')),
            snabbdom_1.h('input#' + id, {
                attrs: {
                    type: 'range',
                    min: 4,
                    max: Math.floor(Math.log2(ceval.maxHashSize)),
                    step: 1
                },
                hook: rangeConfig(() => Math.floor(Math.log2(parseInt(ceval.hashSize()))), v => ctrl.cevalSetHashSize(Math.pow(2, v)))
            }),
            snabbdom_1.h('div.range_value', formatHashSize(parseInt(ceval.hashSize())))
        ]))('analyse-memory') : null
    ] : []) : [];
    const notationConfig = [
        ctrlBoolSetting({
            name: noarg('inlineNotation'),
            title: 'Shift+I',
            id: 'inline',
            checked: ctrl.treeView.inline(),
            change(v) {
                ctrl.treeView.set(v);
                ctrl.actionMenu.toggle();
            }
        }, ctrl)
    ];
    return snabbdom_1.h('div.action-menu', tools
        .concat(notationConfig)
        .concat(cevalConfig)
        .concat(ctrl.mainline.length > 4 ? [snabbdom_1.h('h2', noarg('replayMode')), autoplayButtons(ctrl)] : [])
        .concat([
        deleteButton(ctrl, ctrl.opts.userId),
        canContinue ? snabbdom_1.h('div.continue-with.none.g_' + d.game.id, [
            snabbdom_1.h('a.button', {
                attrs: {
                    href: d.userAnalysis ? '/?fen=' + ctrl.encodeNodeFen() + '#ai' : router_1.cont(d, 'ai') + '?fen=' + ctrl.node.fen,
                    rel: 'nofollow'
                }
            }, noarg('playWithTheMachine')),
            snabbdom_1.h('a.button', {
                attrs: {
                    href: d.userAnalysis ? '/?fen=' + ctrl.encodeNodeFen() + '#friend' : router_1.cont(d, 'friend') + '?fen=' + ctrl.node.fen,
                    rel: 'nofollow'
                }
            }, noarg('playWithAFriend'))
        ]) : null
    ]));
}
exports.view = view;
function ctrlBoolSetting(o, ctrl) {
    return boolSetting_1.boolSetting(o, ctrl.trans, ctrl.redraw);
}

},{"./boolSetting":42,"./pgnExport":66,"./util":110,"common":131,"game/router":139,"snabbdom":35}],40:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ceval_1 = require("ceval");
const chess_1 = require("chess");
const util_1 = require("chessground/util");
function pieceDrop(key, role, color) {
    return {
        orig: key,
        piece: {
            color,
            role,
            scale: 0.8
        },
        brush: 'green'
    };
}
function makeShapesFromUci(color, uci, brush, modifiers) {
    const move = chess_1.decomposeUci(uci);
    if (uci[1] === '@')
        return [
            {
                orig: move[1],
                brush
            },
            pieceDrop(move[1], chess_1.sanToRole[uci[0].toUpperCase()], color)
        ];
    const shapes = [{
            orig: move[0],
            dest: move[1],
            brush,
            modifiers
        }];
    if (move[2])
        shapes.push(pieceDrop(move[1], move[2], color));
    return shapes;
}
exports.makeShapesFromUci = makeShapesFromUci;
function compute(ctrl) {
    const color = ctrl.chessground.state.movable.color;
    const rcolor = util_1.opposite(color);
    if (ctrl.practice) {
        if (ctrl.practice.hovering())
            return makeShapesFromUci(color, ctrl.practice.hovering().uci, 'green');
        const hint = ctrl.practice.hinting();
        if (hint) {
            if (hint.mode === 'move')
                return makeShapesFromUci(color, hint.uci, 'paleBlue');
            else
                return [{
                        orig: hint.uci[1] === '@' ? hint.uci.slice(2, 4) : hint.uci.slice(0, 2),
                        brush: 'paleBlue'
                    }];
        }
        return [];
    }
    const instance = ctrl.getCeval();
    const hovering = ctrl.explorer.hovering() || instance.hovering();
    const { eval: nEval = {}, fen: nFen, ceval: nCeval, threat: nThreat } = ctrl.node;
    let shapes = [];
    if (ctrl.retro && ctrl.retro.showBadNode()) {
        return makeShapesFromUci(color, ctrl.retro.showBadNode().uci, 'paleRed', {
            lineWidth: 8
        });
    }
    if (hovering && hovering.fen === nFen)
        shapes = shapes.concat(makeShapesFromUci(color, hovering.uci, 'paleBlue'));
    if (ctrl.showAutoShapes() && ctrl.showComputer()) {
        if (nEval.best)
            shapes = shapes.concat(makeShapesFromUci(rcolor, nEval.best, 'paleGreen'));
        if (!hovering) {
            let nextBest = ctrl.nextNodeBest();
            if (!nextBest && instance.enabled() && nCeval)
                nextBest = nCeval.pvs[0].moves[0];
            if (nextBest)
                shapes = shapes.concat(makeShapesFromUci(color, nextBest, 'paleBlue'));
            if (instance.enabled() && nCeval && nCeval.pvs[1] && !(ctrl.threatMode() && nThreat && nThreat.pvs.length > 2)) {
                nCeval.pvs.forEach(function (pv) {
                    if (pv.moves[0] === nextBest)
                        return;
                    const shift = ceval_1.winningChances.povDiff(color, nCeval.pvs[0], pv);
                    if (shift >= 0 && shift < 0.2) {
                        shapes = shapes.concat(makeShapesFromUci(color, pv.moves[0], 'paleGrey', {
                            lineWidth: Math.round(12 - shift * 50) // 12 to 2
                        }));
                    }
                });
            }
        }
    }
    if (instance.enabled() && ctrl.threatMode() && nThreat) {
        const [pv0, ...pv1s] = nThreat.pvs;
        shapes = shapes.concat(makeShapesFromUci(rcolor, pv0.moves[0], pv1s.length > 0 ? 'paleRed' : 'red'));
        pv1s.forEach(function (pv) {
            const shift = ceval_1.winningChances.povDiff(rcolor, pv, pv0);
            if (shift >= 0 && shift < 0.2) {
                shapes = shapes.concat(makeShapesFromUci(rcolor, pv.moves[0], 'paleRed', {
                    lineWidth: Math.round(11 - shift * 45) // 11 to 2
                }));
            }
        });
    }
    return shapes;
}
exports.compute = compute;

},{"ceval":113,"chess":129,"chessground/util":18}],41:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const control = require("./control");
class Autoplay {
    constructor(ctrl) {
        this.ctrl = ctrl;
    }
    move() {
        if (control.canGoForward(this.ctrl)) {
            control.next(this.ctrl);
            this.ctrl.redraw();
            return true;
        }
        this.stop();
        this.ctrl.redraw();
        return false;
    }
    evalToCp(node) {
        if (!node.eval)
            return node.ply % 2 ? 990 : -990; // game over
        if (node.eval.mate)
            return (node.eval.mate > 0) ? 990 : -990;
        return node.eval.cp;
    }
    nextDelay() {
        if (typeof this.delay === 'string' && !this.ctrl.onMainline)
            return 1500;
        else if (this.delay === 'realtime') {
            if (this.ctrl.node.ply < 2)
                return 1000;
            const centis = this.ctrl.data.game.moveCentis;
            if (!centis)
                return 1500;
            const time = centis[this.ctrl.node.ply - this.ctrl.tree.root.ply];
            // estimate 130ms of lag to improve playback.
            return time * 10 + 130 || 2000;
        }
        else if (this.delay === 'cpl') {
            const slowDown = 30;
            if (this.ctrl.node.ply >= this.ctrl.mainline.length - 1)
                return 0;
            const currPlyCp = this.evalToCp(this.ctrl.node);
            const nextPlyCp = this.evalToCp(this.ctrl.node.children[0]);
            return Math.max(500, Math.min(10000, Math.abs(currPlyCp - nextPlyCp) * slowDown));
        }
        else
            return this.delay;
    }
    schedule() {
        this.timeout = setTimeout(() => {
            if (this.move())
                this.schedule();
        }, this.nextDelay());
    }
    start(delay) {
        this.delay = delay;
        this.stop();
        this.schedule();
    }
    stop() {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = undefined;
        }
    }
    toggle(delay) {
        if (this.active(delay))
            this.stop();
        else {
            if (!this.active() && !this.move())
                this.ctrl.jump('');
            this.start(delay);
        }
    }
    active(delay) {
        return (!delay || delay === this.delay) && !!this.timeout;
    }
}
exports.Autoplay = Autoplay;

},{"./control":45}],42:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const util_1 = require("./util");
function boolSetting(o, trans, redraw) {
    const fullId = 'abset-' + o.id;
    return snabbdom_1.h('div.setting.' + fullId, o.title ? {
        attrs: { title: trans.noarg(o.title) }
    } : {}, [
        snabbdom_1.h('label', { attrs: { 'for': fullId } }, trans.noarg(o.name)),
        snabbdom_1.h('div.switch', [
            snabbdom_1.h('input#' + fullId + '.cmn-toggle', {
                attrs: {
                    type: 'checkbox',
                    checked: o.checked
                },
                hook: util_1.bind('change', e => o.change(e.target.checked), redraw)
            }),
            snabbdom_1.h('label', { attrs: { 'for': fullId } })
        ])
    ]);
}
exports.boolSetting = boolSetting;

},{"./util":110,"snabbdom":35}],43:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const main_1 = require("./main");
function default_1(cfg) {
    const li = window.lichess, data = cfg.data;
    let analyse;
    li.socket = li.StrongSocket(data.url.socket, data.player.version, {
        options: {
            name: 'analyse'
        },
        params: {
            userTv: data.userTv && data.userTv.id
        },
        receive: function (t, d) {
            analyse.socketReceive(t, d);
        },
        events: {}
    });
    cfg.$side = $('.analyse__side').clone();
    cfg.$underboard = $('.analyse__underboard').clone();
    cfg.trans = li.trans(cfg.i18n);
    cfg.initialPly = 'url';
    cfg.socketSend = li.socket.send;
    analyse = main_1.start(cfg);
}
exports.default = default_1;
;

},{"./main":62}],44:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const studyChapters_1 = require("./study/studyChapters");
function renderClocks(ctrl) {
    if (ctrl.embed)
        return;
    const node = ctrl.node, clock = node.clock;
    if (!clock && clock !== 0)
        return;
    const whitePov = ctrl.bottomIsWhite(), parentClock = ctrl.tree.getParentClock(node, ctrl.path), isWhiteTurn = node.ply % 2 === 0, centis = [parentClock, clock];
    if (!isWhiteTurn)
        centis.reverse();
    const study = ctrl.study, relay = study && study.data.chapter.relay;
    if (relay && relay.lastMoveAt && relay.path === ctrl.path && ctrl.path !== '' && !studyChapters_1.isFinished(study.data.chapter)) {
        const spent = (Date.now() - relay.lastMoveAt) / 10;
        const i = isWhiteTurn ? 0 : 1;
        if (centis[i])
            centis[i] = Math.max(0, centis[i] - spent);
    }
    const showTenths = !ctrl.study || !ctrl.study.relay;
    return [
        renderClock(centis[0], isWhiteTurn, whitePov ? 'bottom' : 'top', showTenths),
        renderClock(centis[1], !isWhiteTurn, whitePov ? 'top' : 'bottom', showTenths)
    ];
}
exports.default = renderClocks;
function renderClock(centis, active, cls, showTenths) {
    return snabbdom_1.h('div.analyse__clock.' + cls, {
        class: { active },
    }, clockContent(centis, showTenths));
}
function clockContent(centis, showTenths) {
    if (!centis && centis !== 0)
        return ['-'];
    const date = new Date(centis * 10), millis = date.getUTCMilliseconds(), sep = ':', baseStr = pad2(date.getUTCMinutes()) + sep + pad2(date.getUTCSeconds());
    if (!showTenths || centis >= 360000)
        return [Math.floor(centis / 360000) + sep + baseStr];
    return centis >= 6000 ? [baseStr] : [
        baseStr,
        snabbdom_1.h('tenths', '.' + Math.floor(millis / 100).toString())
    ];
}
function pad2(num) {
    return (num < 10 ? '0' : '') + num;
}

},{"./study/studyChapters":95,"snabbdom":35}],45:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tree_1 = require("tree");
function canGoForward(ctrl) {
    return ctrl.node.children.length > 0;
}
exports.canGoForward = canGoForward;
function next(ctrl) {
    const child = ctrl.node.children[0];
    if (child)
        ctrl.userJumpIfCan(ctrl.path + child.id);
}
exports.next = next;
function prev(ctrl) {
    ctrl.userJumpIfCan(tree_1.path.init(ctrl.path));
}
exports.prev = prev;
function last(ctrl) {
    ctrl.userJumpIfCan(tree_1.path.fromNodeList(ctrl.mainline));
}
exports.last = last;
function first(ctrl) {
    ctrl.userJump(tree_1.path.root);
}
exports.first = first;
function enterVariation(ctrl) {
    let child = ctrl.node.children[1];
    if (child)
        ctrl.userJump(ctrl.path + child.id);
}
exports.enterVariation = enterVariation;
function exitVariation(ctrl) {
    if (ctrl.onMainline)
        return;
    let found, path = tree_1.path.root;
    ctrl.nodeList.slice(1, -1).forEach(function (n) {
        path += n.id;
        if (n.children[1])
            found = path;
    });
    if (found)
        ctrl.userJump(found);
}
exports.exitVariation = exitVariation;

},{"tree":142}],46:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const drag_1 = require("chessground/drag");
const chess_1 = require("chess");
function drag(ctrl, color, e) {
    if (e.button !== undefined && e.button !== 0)
        return; // only touch or left click
    if (ctrl.chessground.state.movable.color !== color)
        return;
    const el = e.target;
    const role = el.getAttribute('data-role'), number = el.getAttribute('data-nb');
    if (!role || !color || number === '0')
        return;
    e.stopPropagation();
    e.preventDefault();
    drag_1.dragNewPiece(ctrl.chessground.state, { color, role }, e);
}
exports.drag = drag;
function valid(chessground, possibleDrops, piece, pos) {
    if (piece.color !== chessground.state.movable.color)
        return false;
    if (piece.role === 'pawn' && (pos[1] === '1' || pos[1] === '8'))
        return false;
    const drops = chess_1.readDrops(possibleDrops);
    if (drops === null)
        return true;
    return drops.includes(pos);
}
exports.valid = valid;

},{"chess":129,"chessground/drag":7}],47:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crazyCtrl_1 = require("./crazyCtrl");
const snabbdom_1 = require("snabbdom");
const util_1 = require("../util");
const eventNames = ['mousedown', 'touchstart'];
const oKeys = ['pawn', 'knight', 'bishop', 'rook', 'queen'];
function default_1(ctrl, color, position) {
    if (!ctrl.node.crazy)
        return;
    const pocket = ctrl.node.crazy.pockets[color === 'white' ? 0 : 1];
    const dropped = ctrl.justDropped;
    let captured = ctrl.justCaptured;
    if (captured)
        captured.role = captured.promoted ? 'pawn' : captured.role;
    const activeColor = color === ctrl.turnColor();
    const usable = !ctrl.embed && activeColor;
    return snabbdom_1.h(`div.pocket.is2d.pocket-${position}.pos-${ctrl.bottomColor()}`, {
        class: { usable },
        hook: util_1.onInsert(el => {
            if (ctrl.embed)
                return;
            eventNames.forEach(name => {
                el.addEventListener(name, e => crazyCtrl_1.drag(ctrl, color, e));
            });
        })
    }, oKeys.map(role => {
        let nb = pocket[role] || 0;
        if (activeColor) {
            if (dropped === role)
                nb--;
            if (captured && captured.role === role)
                nb++;
        }
        return snabbdom_1.h('div.pocket-c1', snabbdom_1.h('div.pocket-c2', snabbdom_1.h('piece.' + role + '.' + color, {
            attrs: {
                'data-role': role,
                'data-color': color,
                'data-nb': nb
            }
        })));
    }));
}
exports.default = default_1;

},{"../util":110,"./crazyCtrl":46,"snabbdom":35}],48:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("chessground/util");
const chess_1 = require("chess");
const fen_1 = require("chessops/fen");
const variant_1 = require("chessops/variant");
const tree_1 = require("tree");
const keyboard = require("./keyboard");
const actionMenu_1 = require("./actionMenu");
const autoplay_1 = require("./autoplay");
const promotion = require("./promotion");
const util = require("./util");
const chessUtil = require("chess");
const common_1 = require("common");
const throttle_1 = require("common/throttle");
const storage_1 = require("common/storage");
const socket_1 = require("./socket");
const forecastCtrl_1 = require("./forecast/forecastCtrl");
const ceval_1 = require("ceval");
const explorerCtrl_1 = require("./explorer/explorerCtrl");
const game = require("game");
const crazyCtrl_1 = require("./crazy/crazyCtrl");
const studyCtrl_1 = require("./study/studyCtrl");
const fork_1 = require("./fork");
const retroCtrl_1 = require("./retrospect/retroCtrl");
const practiceCtrl_1 = require("./practice/practiceCtrl");
const evalCache_1 = require("./evalCache");
const autoShape_1 = require("./autoShape");
const nodeFinder_1 = require("./nodeFinder");
const speech = require("./speech");
const treeView_1 = require("./treeView/treeView");
const li = window.lichess;
class AnalyseCtrl {
    constructor(opts, redraw) {
        this.opts = opts;
        this.redraw = redraw;
        this.autoScrollRequested = false;
        this.redirecting = false;
        this.onMainline = true;
        // display flags
        this.flipped = false;
        this.showComments = true; // whether to display comments in the move tree
        this.showAutoShapes = storage_1.storedProp('show-auto-shapes', true);
        this.showGauge = storage_1.storedProp('show-gauge', true);
        this.showComputer = storage_1.storedProp('show-computer', true);
        this.keyboardHelp = location.hash === '#keyboard';
        this.threatMode = common_1.prop(false);
        this.cgVersion = {
            js: 1,
            dom: 1
        };
        this.setPath = (path) => {
            this.path = path;
            this.nodeList = this.tree.getNodeList(path);
            this.node = tree_1.ops.last(this.nodeList);
            this.mainline = tree_1.ops.mainlineNodeList(this.tree.root);
            this.onMainline = this.tree.pathIsMainline(path);
        };
        this.flip = () => {
            this.flipped = !this.flipped;
            this.chessground.set({
                orientation: this.bottomColor()
            });
            if (this.retro) {
                this.retro = undefined;
                this.toggleRetro();
            }
            if (this.practice)
                this.restartPractice();
            this.redraw();
        };
        this.bottomIsWhite = () => this.bottomColor() === 'white';
        this.getDests = throttle_1.default(800, () => {
            if (!this.embed && !common_1.defined(this.node.dests))
                this.socket.sendAnaDests({
                    variant: this.data.game.variant.key,
                    fen: this.node.fen,
                    path: this.path
                });
        });
        this.sound = li.sound ? {
            move: throttle_1.default(50, li.sound.move),
            capture: throttle_1.default(50, li.sound.capture),
            check: throttle_1.default(50, li.sound.check)
        } : {
            move: $.noop,
            capture: $.noop,
            check: $.noop
        };
        this.onChange = throttle_1.default(300, () => {
            li.pubsub.emit('analysis.change', this.node.fen, this.path, this.onMainline ? this.node.ply : false);
        });
        this.updateHref = li.debounce(() => {
            if (!this.opts.study)
                window.history.replaceState(null, '', '#' + this.node.ply);
        }, 750);
        this.playedLastMoveMyself = () => !!this.justPlayed && !!this.node.uci && this.node.uci.startsWith(this.justPlayed);
        this.userJump = (path) => {
            this.autoplay.stop();
            this.withCg(cg => cg.selectSquare(null));
            if (this.practice) {
                const prev = this.path;
                this.practice.preUserJump(prev, path);
                this.jump(path);
                this.practice.postUserJump(prev, this.path);
            }
            else
                this.jump(path);
        };
        this.jumpToMain = (ply) => {
            this.userJump(this.mainlinePathToPly(ply));
        };
        this.jumpToIndex = (index) => {
            this.jumpToMain(index + 1 + this.tree.root.ply);
        };
        this.userNewPiece = (piece, pos) => {
            if (crazyCtrl_1.valid(this.chessground, this.node.drops, piece, pos)) {
                this.justPlayed = chessUtil.roleToSan[piece.role] + '@' + pos;
                this.justDropped = piece.role;
                this.justCaptured = undefined;
                this.sound.move();
                const drop = {
                    role: piece.role,
                    pos,
                    variant: this.data.game.variant.key,
                    fen: this.node.fen,
                    path: this.path
                };
                this.socket.sendAnaDrop(drop);
                this.preparePremoving();
                this.redraw();
            }
            else
                this.jump(this.path);
        };
        this.userMove = (orig, dest, capture) => {
            this.justPlayed = orig;
            this.justDropped = undefined;
            const piece = this.chessground.state.pieces[dest];
            const isCapture = capture || (piece && piece.role == 'pawn' && orig[0] != dest[0]);
            this.sound[isCapture ? 'capture' : 'move']();
            if (!promotion.start(this, orig, dest, capture, this.sendMove))
                this.sendMove(orig, dest, capture);
        };
        this.sendMove = (orig, dest, capture, prom) => {
            const move = {
                orig,
                dest,
                variant: this.data.game.variant.key,
                fen: this.node.fen,
                path: this.path
            };
            if (capture)
                this.justCaptured = capture;
            if (prom)
                move.promotion = prom;
            if (this.practice)
                this.practice.onUserMove();
            this.socket.sendAnaMove(move);
            this.preparePremoving();
            this.redraw();
        };
        this.onPremoveSet = () => {
            if (this.study)
                this.study.onPremoveSet();
        };
        this.setAutoShapes = () => {
            this.withCg(cg => cg.setAutoShapes(autoShape_1.compute(this)));
        };
        this.onNewCeval = (ev, path, isThreat) => {
            this.tree.updateAt(path, (node) => {
                if (node.fen !== ev.fen && !isThreat)
                    return;
                if (isThreat) {
                    if (!node.threat || ceval_1.isEvalBetter(ev, node.threat) || node.threat.maxDepth < ev.maxDepth)
                        node.threat = ev;
                }
                else if (ceval_1.isEvalBetter(ev, node.ceval))
                    node.ceval = ev;
                else if (node.ceval && ev.maxDepth > node.ceval.maxDepth)
                    node.ceval.maxDepth = ev.maxDepth;
                if (path === this.path) {
                    this.setAutoShapes();
                    if (!isThreat) {
                        if (this.retro)
                            this.retro.onCeval();
                        if (this.practice)
                            this.practice.onCeval();
                        if (this.studyPractice)
                            this.studyPractice.onCeval();
                        this.evalCache.onCeval();
                        if (ev.cloud && ev.depth >= this.ceval.effectiveMaxDepth())
                            this.ceval.stop();
                    }
                    this.redraw();
                }
            });
        };
        this.startCeval = throttle_1.default(800, () => {
            if (this.ceval.enabled()) {
                if (this.canUseCeval()) {
                    this.ceval.start(this.path, this.nodeList, this.threatMode(), false);
                    this.evalCache.fetch(this.path, parseInt(this.ceval.multiPv()));
                }
                else
                    this.ceval.stop();
            }
        });
        this.toggleCeval = () => {
            if (!this.showComputer())
                return;
            this.ceval.toggle();
            this.setAutoShapes();
            this.startCeval();
            if (!this.ceval.enabled()) {
                this.threatMode(false);
                if (this.practice)
                    this.togglePractice();
            }
            this.redraw();
        };
        this.toggleThreatMode = () => {
            if (this.node.check)
                return;
            if (!this.ceval.enabled())
                this.ceval.toggle();
            if (!this.ceval.enabled())
                return;
            this.threatMode(!this.threatMode());
            if (this.threatMode() && this.practice)
                this.togglePractice();
            this.setAutoShapes();
            this.startCeval();
            this.redraw();
        };
        this.disableThreatMode = () => {
            return !!this.practice;
        };
        this.mandatoryCeval = () => {
            return !!this.studyPractice;
        };
        this.cevalSetMultiPv = (v) => {
            this.ceval.multiPv(v);
            this.tree.removeCeval();
            this.cevalReset();
        };
        this.cevalSetThreads = (v) => {
            if (!this.ceval.threads)
                return;
            this.ceval.threads(v);
            this.cevalReset();
        };
        this.cevalSetHashSize = (v) => {
            if (!this.ceval.hashSize)
                return;
            this.ceval.hashSize(v);
            this.cevalReset();
        };
        this.cevalSetInfinite = (v) => {
            this.ceval.infinite(v);
            this.cevalReset();
        };
        this.hasFullComputerAnalysis = () => {
            return Object.keys(this.mainline[0].eval || {}).length > 0;
        };
        this.toggleAutoShapes = (v) => {
            this.showAutoShapes(v);
            this.resetAutoShapes();
        };
        this.toggleGauge = () => {
            this.showGauge(!this.showGauge());
        };
        this.toggleComputer = () => {
            if (this.ceval.enabled())
                this.toggleCeval();
            const value = !this.showComputer();
            this.showComputer(value);
            if (!value && this.practice)
                this.togglePractice();
            this.onToggleComputer();
            li.pubsub.emit('analysis.comp.toggle', value);
        };
        this.canEvalGet = (node) => this.opts.study || node.ply < 15;
        this.toggleRetro = () => {
            if (this.retro)
                this.retro = undefined;
            else {
                this.retro = retroCtrl_1.make(this);
                if (this.practice)
                    this.togglePractice();
                if (this.explorer.enabled())
                    this.toggleExplorer();
            }
            this.setAutoShapes();
        };
        this.toggleExplorer = () => {
            if (this.practice)
                this.togglePractice();
            this.explorer.toggle();
        };
        this.togglePractice = () => {
            if (this.practice || !this.ceval.possible)
                this.practice = undefined;
            else {
                if (this.retro)
                    this.toggleRetro();
                if (this.explorer.enabled())
                    this.toggleExplorer();
                this.practice = practiceCtrl_1.make(this, () => {
                    // push to 20 to store AI moves in the cloud
                    // lower to 18 after task completion (or failure)
                    return this.studyPractice && this.studyPractice.success() === null ? 20 : 18;
                });
            }
            this.setAutoShapes();
        };
        this.gamebookPlay = () => {
            return this.study && this.study.gamebookPlay();
        };
        this.isGamebook = () => !!(this.study && this.study.data.chapter.gamebook);
        this.data = opts.data;
        this.element = opts.element;
        this.embed = opts.embed;
        this.trans = opts.trans;
        this.treeView = treeView_1.ctrl(opts.embed ? 'inline' : 'column');
        if (this.data.forecast)
            this.forecast = forecastCtrl_1.make(this.data.forecast, this.data, redraw);
        if (li.AnalyseNVUI)
            this.nvui = li.AnalyseNVUI(redraw);
        this.instanciateEvalCache();
        this.initialize(this.data, false);
        this.instanciateCeval();
        this.initialPath = tree_1.path.root;
        if (opts.initialPly) {
            const loc = window.location, intHash = loc.hash === '#last' ? this.tree.lastPly() : parseInt(loc.hash.substr(1)), plyStr = opts.initialPly === 'url' ? (intHash || '') : opts.initialPly;
            // remove location hash - http://stackoverflow.com/questions/1397329/how-to-remove-the-hash-from-window-location-with-javascript-without-page-refresh/5298684#5298684
            if (intHash)
                window.history.pushState("", document.title, loc.pathname + loc.search);
            const mainline = tree_1.ops.mainlineNodeList(this.tree.root);
            if (plyStr === 'last')
                this.initialPath = tree_1.path.fromNodeList(mainline);
            else {
                const ply = parseInt(plyStr);
                if (ply)
                    this.initialPath = tree_1.ops.takePathWhile(mainline, n => n.ply <= ply);
            }
        }
        this.setPath(this.initialPath);
        this.showGround();
        this.onToggleComputer();
        this.startCeval();
        this.explorer.setNode();
        this.study = opts.study ? studyCtrl_1.default(opts.study, this, (opts.tagTypes || '').split(','), opts.practice, opts.relay) : undefined;
        this.studyPractice = this.study ? this.study.practice : undefined;
        if (location.hash === '#practice' || (this.study && this.study.data.chapter.practice))
            this.togglePractice();
        else if (location.hash === '#menu')
            li.requestIdleCallback(this.actionMenu.toggle);
        keyboard.bind(this);
        li.pubsub.on('jump', (ply) => {
            this.jumpToMain(parseInt(ply));
            this.redraw();
        });
        li.pubsub.on('sound_set', (set) => {
            if (!this.music && set === 'music')
                li.loadScript('javascripts/music/replay.js').then(() => {
                    this.music = window.lichessReplayMusic();
                });
            if (this.music && set !== 'music')
                this.music = null;
        });
        li.pubsub.on('analysis.change.trigger', this.onChange);
        li.pubsub.on('analysis.chart.click', index => {
            this.jumpToIndex(index);
            this.redraw();
        });
        li.sound && speech.setup();
    }
    initialize(data, merge) {
        this.data = data;
        this.synthetic = data.game.id === 'synthetic';
        this.ongoing = !this.synthetic && game.playable(data);
        const prevTree = merge && this.tree.root;
        this.tree = tree_1.build(tree_1.ops.reconstruct(this.data.treeParts));
        if (prevTree)
            this.tree.merge(prevTree);
        this.actionMenu = new actionMenu_1.Ctrl();
        this.autoplay = new autoplay_1.Autoplay(this);
        if (this.socket)
            this.socket.clearCache();
        else
            this.socket = socket_1.make(this.opts.socketSend, this);
        this.explorer = explorerCtrl_1.default(this, this.opts.explorer, this.explorer ? this.explorer.allowed() : !this.embed);
        this.gamePath = this.synthetic || this.ongoing ? undefined :
            tree_1.path.fromNodeList(tree_1.ops.mainlineNodeList(this.tree.root));
        this.fork = fork_1.make(this);
    }
    topColor() {
        return util_1.opposite(this.bottomColor());
    }
    bottomColor() {
        return this.flipped ? util_1.opposite(this.data.orientation) : this.data.orientation;
    }
    getOrientation() {
        return this.bottomColor();
    }
    getNode() {
        return this.node;
    }
    turnColor() {
        return util.plyColor(this.node.ply);
    }
    togglePlay(delay) {
        this.autoplay.toggle(delay);
        this.actionMenu.open = false;
    }
    uciToLastMove(uci) {
        if (!uci)
            return;
        if (uci[1] === '@')
            return [uci.substr(2, 2), uci.substr(2, 2)];
        return [uci.substr(0, 2), uci.substr(2, 2)];
    }
    ;
    showGround() {
        this.onChange();
        if (!common_1.defined(this.node.dests))
            this.getDests();
        this.withCg(cg => {
            cg.set(this.makeCgOpts());
            this.setAutoShapes();
            if (this.node.shapes)
                cg.setShapes(this.node.shapes);
        });
    }
    makeCgOpts() {
        const node = this.node, color = this.turnColor(), dests = chessUtil.readDests(this.node.dests), drops = chessUtil.readDrops(this.node.drops), movableColor = (this.practice || this.gamebookPlay()) ? this.bottomColor() : (!this.embed && ((dests && Object.keys(dests).length > 0) ||
            drops === null || drops.length) ? color : undefined), config = {
            fen: node.fen,
            turnColor: color,
            movable: this.embed ? {
                color: undefined,
                dests: {}
            } : {
                color: movableColor,
                dests: (movableColor === color ? (dests || {}) : {})
            },
            check: !!node.check,
            lastMove: this.uciToLastMove(node.uci)
        };
        if (!dests && !node.check) {
            // premove while dests are loading from server
            // can't use when in check because it highlights the wrong king
            config.turnColor = util_1.opposite(color);
            config.movable.color = color;
        }
        config.premovable = {
            enabled: config.movable.color && config.turnColor !== config.movable.color
        };
        this.cgConfig = config;
        return config;
    }
    autoScroll() {
        this.autoScrollRequested = true;
    }
    jump(path) {
        const pathChanged = path !== this.path, isForwardStep = pathChanged && path.length == this.path.length + 2;
        this.setPath(path);
        this.showGround();
        if (pathChanged) {
            const playedMyself = this.playedLastMoveMyself();
            if (this.study)
                this.study.setPath(path, this.node, playedMyself);
            if (isForwardStep) {
                if (!this.node.uci)
                    this.sound.move(); // initial position
                else if (!playedMyself) {
                    if (this.node.san.includes('x'))
                        this.sound.capture();
                    else
                        this.sound.move();
                }
                if (/\+|\#/.test(this.node.san))
                    this.sound.check();
            }
            this.threatMode(false);
            this.ceval.stop();
            this.startCeval();
            speech.node(this.node);
        }
        this.justPlayed = this.justDropped = this.justCaptured = undefined;
        this.explorer.setNode();
        this.updateHref();
        this.autoScroll();
        promotion.cancel(this);
        if (pathChanged) {
            if (this.retro)
                this.retro.onJump();
            if (this.practice)
                this.practice.onJump();
            if (this.study)
                this.study.onJump();
        }
        if (this.music)
            this.music.jump(this.node);
        li.pubsub.emit('ply', this.node.ply);
    }
    canJumpTo(path) {
        return !this.study || this.study.canJumpTo(path);
    }
    userJumpIfCan(path) {
        if (this.canJumpTo(path))
            this.userJump(path);
    }
    mainlinePathToPly(ply) {
        return tree_1.ops.takePathWhile(this.mainline, n => n.ply <= ply);
    }
    jumpToGlyphSymbol(color, symbol) {
        const node = nodeFinder_1.nextGlyphSymbol(color, symbol, this.mainline, this.node.ply);
        if (node)
            this.jumpToMain(node.ply);
        this.redraw();
    }
    reloadData(data, merge) {
        this.initialize(data, merge);
        this.redirecting = false;
        this.setPath(tree_1.path.root);
        this.instanciateCeval();
        this.instanciateEvalCache();
        this.cgVersion.js++;
    }
    changePgn(pgn) {
        this.redirecting = true;
        $.ajax({
            url: '/analysis/pgn',
            method: 'post',
            data: { pgn },
            success: (data) => {
                this.reloadData(data, false);
                this.userJump(this.mainlinePathToPly(this.tree.lastPly()));
                this.redraw();
            },
            error: error => {
                console.log(error);
                this.redirecting = false;
                this.redraw();
            }
        });
    }
    changeFen(fen) {
        this.redirecting = true;
        window.location.href = '/analysis/' + this.data.game.variant.key + '/' + encodeURIComponent(fen).replace(/%20/g, '_').replace(/%2F/g, '/');
    }
    preparePremoving() {
        this.chessground.set({
            turnColor: this.chessground.state.movable.color,
            movable: {
                color: util_1.opposite(this.chessground.state.movable.color)
            },
            premovable: {
                enabled: true
            }
        });
    }
    addNode(node, path) {
        const newPath = this.tree.addNode(node, path);
        if (!newPath) {
            console.log("Can't addNode", node, path);
            return this.redraw();
        }
        this.jump(newPath);
        this.redraw();
        this.chessground.playPremove();
    }
    addDests(dests, path, opening) {
        this.tree.addDests(dests, path, opening);
        if (path === this.path) {
            this.showGround();
            // this.redraw();
            if (this.gameOver())
                this.ceval.stop();
        }
        this.withCg(cg => cg.playPremove());
    }
    deleteNode(path) {
        const node = this.tree.nodeAtPath(path);
        if (!node)
            return;
        const count = tree_1.ops.countChildrenAndComments(node);
        if ((count.nodes >= 10 || count.comments > 0) && !confirm('Delete ' + util.plural('move', count.nodes) + (count.comments ? ' and ' + util.plural('comment', count.comments) : '') + '?'))
            return;
        this.tree.deleteNodeAt(path);
        if (tree_1.path.contains(this.path, path))
            this.userJump(tree_1.path.init(path));
        else
            this.jump(this.path);
        if (this.study)
            this.study.deleteNode(path);
    }
    promote(path, toMainline) {
        this.tree.promoteAt(path, toMainline);
        this.jump(path);
        if (this.study)
            this.study.promote(path, toMainline);
    }
    forceVariation(path, force) {
        this.tree.forceVariationAt(path, force);
        this.jump(path);
        if (this.study)
            this.study.forceVariation(path, force);
    }
    reset() {
        this.showGround();
        this.redraw();
    }
    encodeNodeFen() {
        return this.node.fen.replace(/\s/g, '_');
    }
    currentEvals() {
        return {
            server: this.node.eval,
            client: this.node.ceval
        };
    }
    nextNodeBest() {
        return tree_1.ops.withMainlineChild(this.node, (n) => n.eval ? n.eval.best : undefined);
    }
    instanciateCeval() {
        if (this.ceval)
            this.ceval.destroy();
        const cfg = {
            variant: this.data.game.variant,
            possible: !this.embed && (this.synthetic || !game.playable(this.data)),
            emit: (ev, work) => {
                this.onNewCeval(ev, work.path, work.threatMode);
            },
            setAutoShapes: this.setAutoShapes,
            redraw: this.redraw
        };
        if (this.opts.study && this.opts.practice) {
            cfg.storageKeyPrefix = 'practice';
            cfg.multiPvDefault = 1;
        }
        this.ceval = ceval_1.ctrl(cfg);
    }
    getCeval() {
        return this.ceval;
    }
    gameOver(node) {
        const n = node || this.node;
        if (n.dests !== '' || n.drops)
            return false;
        if (n.check)
            return 'checkmate';
        return 'draw';
    }
    position(node) {
        const setup = fen_1.parseFen(node.fen).unwrap();
        return variant_1.setupPosition(chess_1.variantToRules(this.data.game.variant.key), setup);
    }
    canUseCeval() {
        return !this.gameOver() && !this.node.threefold;
    }
    cevalReset() {
        this.ceval.stop();
        if (!this.ceval.enabled())
            this.ceval.toggle();
        this.startCeval();
        this.redraw();
    }
    showEvalGauge() {
        return this.hasAnyComputerAnalysis() && this.showGauge() && !this.gameOver() && this.showComputer();
    }
    hasAnyComputerAnalysis() {
        return this.data.analysis ? true : this.ceval.enabled();
    }
    resetAutoShapes() {
        if (this.showAutoShapes())
            this.setAutoShapes();
        else
            this.chessground && this.chessground.setAutoShapes([]);
    }
    onToggleComputer() {
        if (!this.showComputer()) {
            this.tree.removeComputerVariations();
            if (this.ceval.enabled())
                this.toggleCeval();
            this.chessground && this.chessground.setAutoShapes([]);
        }
        else
            this.resetAutoShapes();
    }
    mergeAnalysisData(data) {
        if (this.study && this.study.data.chapter.id !== data.ch)
            return;
        this.tree.merge(data.tree);
        if (!this.showComputer())
            this.tree.removeComputerVariations();
        this.data.analysis = data.analysis;
        if (data.analysis)
            data.analysis.partial = !!tree_1.ops.findInMainline(data.tree, n => !n.eval && !!n.children.length);
        if (data.division)
            this.data.game.division = data.division;
        if (this.retro)
            this.retro.onMergeAnalysisData();
        if (this.study)
            this.study.serverEval.onMergeAnalysisData();
        li.pubsub.emit('analysis.server.progress', this.data);
        this.redraw();
    }
    playUci(uci) {
        const move = chessUtil.decomposeUci(uci);
        if (uci[1] === '@')
            this.chessground.newPiece({
                color: this.chessground.state.movable.color,
                role: chessUtil.sanToRole[uci[0]]
            }, move[1]);
        else {
            const capture = this.chessground.state.pieces[move[1]];
            const promotion = move[2] && chessUtil.sanToRole[move[2].toUpperCase()];
            this.sendMove(move[0], move[1], capture, promotion);
        }
    }
    explorerMove(uci) {
        this.playUci(uci);
        this.explorer.loading(true);
    }
    playBestMove() {
        const uci = this.nextNodeBest() || (this.node.ceval && this.node.ceval.pvs[0].moves[0]);
        if (uci)
            this.playUci(uci);
    }
    instanciateEvalCache() {
        this.evalCache = evalCache_1.make({
            variant: this.data.game.variant.key,
            canGet: this.canEvalGet,
            canPut: (node) => {
                return this.data.evalPut && this.canEvalGet(node) && (
                // if not in study, only put decent opening moves
                this.opts.study || (!node.ceval.mate && Math.abs(node.ceval.cp) < 99));
            },
            getNode: () => this.node,
            send: this.opts.socketSend,
            receive: this.onNewCeval
        });
    }
    restartPractice() {
        this.practice = undefined;
        this.togglePractice();
    }
    withCg(f) {
        if (this.chessground && this.cgVersion.js === this.cgVersion.dom)
            return f(this.chessground);
    }
}
exports.default = AnalyseCtrl;
;

},{"./actionMenu":39,"./autoShape":40,"./autoplay":41,"./crazy/crazyCtrl":46,"./evalCache":49,"./explorer/explorerCtrl":51,"./forecast/forecastCtrl":56,"./fork":58,"./keyboard":61,"./nodeFinder":65,"./practice/practiceCtrl":67,"./promotion":69,"./retrospect/retroCtrl":70,"./socket":73,"./speech":74,"./study/studyCtrl":97,"./treeView/treeView":109,"./util":110,"ceval":113,"chess":129,"chessground/util":18,"chessops/fen":23,"chessops/variant":29,"common":131,"common/storage":135,"common/throttle":137,"game":138,"tree":142}],49:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("common");
const throttle_1 = require("common/throttle");
const evalPutMinDepth = 20;
const evalPutMinNodes = 3e6;
const evalPutMaxMoves = 10;
function qualityCheck(ev) {
    // below 500k nodes, the eval might come from an imminent threefold repetition
    // and should therefore be ignored
    return ev.nodes > 500000 && (ev.depth >= evalPutMinDepth || ev.nodes > evalPutMinNodes);
}
// from client eval to server eval
function toPutData(variant, ev) {
    const data = {
        fen: ev.fen,
        knodes: Math.round(ev.nodes / 1000),
        depth: ev.depth,
        pvs: ev.pvs.map(pv => {
            return {
                cp: pv.cp,
                mate: pv.mate,
                moves: pv.moves.slice(0, evalPutMaxMoves).join(' ')
            };
        })
    };
    if (variant !== 'standard')
        data.variant = variant;
    return data;
}
// from server eval to client eval
function toCeval(e) {
    const res = {
        fen: e.fen,
        nodes: e.knodes * 1000,
        depth: e.depth,
        pvs: e.pvs.map(function (from) {
            const to = {
                moves: from.moves.split(' ')
            };
            if (common_1.defined(from.cp))
                to.cp = from.cp;
            else
                to.mate = from.mate;
            return to;
        }),
        cloud: true
    };
    if (common_1.defined(res.pvs[0].cp))
        res.cp = res.pvs[0].cp;
    else
        res.mate = res.pvs[0].mate;
    res.cloud = true;
    return res;
}
function make(opts) {
    const fenFetched = [];
    function hasFetched(node) {
        return fenFetched.includes(node.fen);
    }
    ;
    let upgradable = common_1.prop(false);
    return {
        onCeval: throttle_1.default(500, function () {
            const node = opts.getNode(), ev = node.ceval;
            if (ev && !ev.cloud && hasFetched(node) && qualityCheck(ev) && opts.canPut(node)) {
                opts.send("evalPut", toPutData(opts.variant, ev));
            }
        }),
        fetch(path, multiPv) {
            const node = opts.getNode();
            if ((node.ceval && node.ceval.cloud) || !opts.canGet(node))
                return;
            if (hasFetched(node))
                return;
            fenFetched.push(node.fen);
            const obj = {
                fen: node.fen,
                path
            };
            if (opts.variant !== 'standard')
                obj.variant = opts.variant;
            if (multiPv > 1)
                obj.mpv = multiPv;
            if (upgradable())
                obj.up = true;
            opts.send("evalGet", obj);
        },
        onCloudEval(serverEval) {
            opts.receive(toCeval(serverEval), serverEval.path);
        },
        upgradable
    };
}
exports.make = make;
;

},{"common":131,"common/throttle":137}],50:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const common_1 = require("common");
const storage_1 = require("common/storage");
const util_1 = require("../util");
const allSpeeds = ['bullet', 'blitz', 'rapid', 'classical'];
const allRatings = [1600, 1800, 2000, 2200, 2500];
function controller(game, onClose, trans, redraw) {
    const variant = (game.variant.key === 'fromPosition') ? 'standard' : game.variant.key;
    const available = ['lichess'];
    if (variant === 'standard')
        available.unshift('masters');
    const data = {
        open: common_1.prop(false),
        db: {
            available,
            selected: available.length > 1 ? storage_1.storedProp('explorer.db.' + variant, available[0]) : function () {
                return available[0];
            }
        },
        rating: {
            available: allRatings,
            selected: storage_1.storedJsonProp('explorer.rating', allRatings)
        },
        speed: {
            available: allSpeeds,
            selected: storage_1.storedJsonProp('explorer.speed', allSpeeds)
        }
    };
    const toggleMany = function (c, value) {
        if (!c().includes(value))
            c(c().concat([value]));
        else if (c().length > 1)
            c(c().filter(v => v !== value));
    };
    return {
        trans,
        redraw,
        data,
        toggleOpen() {
            data.open(!data.open());
            if (!data.open())
                onClose();
        },
        toggleDb(db) {
            data.db.selected(db);
        },
        toggleRating(v) { toggleMany(data.rating.selected, v); },
        toggleSpeed(v) { toggleMany(data.speed.selected, v); },
        fullHouse() {
            return data.db.selected() === 'masters' || (data.rating.selected().length === data.rating.available.length &&
                data.speed.selected().length === data.speed.available.length);
        }
    };
}
exports.controller = controller;
function view(ctrl) {
    const d = ctrl.data;
    return [
        snabbdom_1.h('section.db', [
            snabbdom_1.h('label', ctrl.trans.noarg('database')),
            snabbdom_1.h('div.choices', d.db.available.map(function (s) {
                return snabbdom_1.h('span', {
                    class: { selected: d.db.selected() === s },
                    hook: util_1.bind('click', _ => ctrl.toggleDb(s), ctrl.redraw)
                }, s);
            }))
        ]),
        d.db.selected() === 'masters' ? snabbdom_1.h('div.masters.message', [
            snabbdom_1.h('i', { attrs: util_1.dataIcon('C') }),
            snabbdom_1.h('p', ctrl.trans('masterDbExplanation', 2200, '1952', '2019'))
        ]) : snabbdom_1.h('div', [
            snabbdom_1.h('section.rating', [
                snabbdom_1.h('label', ctrl.trans.noarg('averageElo')),
                snabbdom_1.h('div.choices', d.rating.available.map(function (r) {
                    return snabbdom_1.h('span', {
                        class: { selected: d.rating.selected().includes(r) },
                        hook: util_1.bind('click', _ => ctrl.toggleRating(r), ctrl.redraw)
                    }, r.toString());
                }))
            ]),
            snabbdom_1.h('section.speed', [
                snabbdom_1.h('label', ctrl.trans.noarg('timeControl')),
                snabbdom_1.h('div.choices', d.speed.available.map(function (s) {
                    return snabbdom_1.h('span', {
                        class: { selected: d.speed.selected().includes(s) },
                        hook: util_1.bind('click', _ => ctrl.toggleSpeed(s), ctrl.redraw)
                    }, s);
                }))
            ])
        ]),
        snabbdom_1.h('section.save', snabbdom_1.h('button.button.button-green.text', {
            attrs: util_1.dataIcon('E'),
            hook: util_1.bind('click', ctrl.toggleOpen)
        }, ctrl.trans.noarg('allSet')))
    ];
}
exports.view = view;

},{"../util":110,"common":131,"common/storage":135,"snabbdom":35}],51:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("common");
const storage_1 = require("common/storage");
const util_1 = require("chessground/util");
const explorerConfig_1 = require("./explorerConfig");
const xhr = require("./explorerXhr");
const explorerUtil_1 = require("./explorerUtil");
const gameUtil = require("game");
function pieceCount(fen) {
    const parts = fen.split(/\s/);
    return parts[0].split(/[nbrqkp]/i).length - 1;
}
function tablebasePieces(variant) {
    switch (variant) {
        case 'standard':
        case 'fromPosition':
        case 'chess960':
            return 7;
        case 'atomic':
        case 'antichess':
            return 6;
        default:
            return 0;
    }
}
function tablebaseGuaranteed(variant, fen) {
    return pieceCount(fen) <= tablebasePieces(variant);
}
exports.tablebaseGuaranteed = tablebaseGuaranteed;
function tablebaseRelevant(variant, fen) {
    return pieceCount(fen) - 1 <= tablebasePieces(variant);
}
function default_1(root, opts, allow) {
    const allowed = common_1.prop(allow), enabled = root.embed ? common_1.prop(false) : storage_1.storedProp('explorer.enabled', false), loading = common_1.prop(true), failing = common_1.prop(false), hovering = common_1.prop(null), movesAway = common_1.prop(0), gameMenu = common_1.prop(null);
    if ((location.hash === '#explorer' || location.hash === '#opening') && !root.embed)
        enabled(true);
    let cache = {};
    function onConfigClose() {
        root.redraw();
        cache = {};
        setNode();
    }
    const data = root.data, withGames = root.synthetic || gameUtil.replayable(data) || !!data.opponent.ai, effectiveVariant = data.game.variant.key === 'fromPosition' ? 'standard' : data.game.variant.key, config = explorerConfig_1.controller(data.game, onConfigClose, root.trans, root.redraw);
    const fetch = window.lichess.debounce(function () {
        const fen = root.node.fen;
        const request = (withGames && tablebaseRelevant(effectiveVariant, fen)) ?
            xhr.tablebase(opts.tablebaseEndpoint, effectiveVariant, fen) :
            xhr.opening(opts.endpoint, effectiveVariant, fen, config.data, withGames);
        request.then((res) => {
            cache[fen] = res;
            movesAway(res.moves.length ? 0 : movesAway() + 1);
            loading(false);
            failing(false);
            root.redraw();
        }, () => {
            loading(false);
            failing(true);
            root.redraw();
        });
    }, 250, true);
    const empty = {
        opening: true,
        moves: {}
    };
    function setNode() {
        if (!enabled())
            return;
        gameMenu(null);
        const node = root.node;
        if (node.ply > 50 && !tablebaseRelevant(effectiveVariant, node.fen)) {
            cache[node.fen] = empty;
        }
        const cached = cache[root.node.fen];
        if (cached) {
            movesAway(cached.moves.length ? 0 : movesAway() + 1);
            loading(false);
            failing(false);
        }
        else {
            loading(true);
            fetch();
        }
    }
    ;
    return {
        allowed,
        enabled,
        setNode,
        loading,
        failing,
        hovering,
        movesAway,
        config,
        withGames,
        gameMenu,
        current: () => cache[root.node.fen],
        toggle() {
            movesAway(0);
            enabled(!enabled());
            setNode();
            root.autoScroll();
        },
        disable() {
            if (enabled()) {
                enabled(false);
                gameMenu(null);
                root.autoScroll();
            }
        },
        setHovering(fen, uci) {
            hovering(uci ? {
                fen,
                uci,
            } : null);
            root.setAutoShapes();
        },
        fetchMasterOpening: (function () {
            const masterCache = {};
            return (fen) => {
                if (masterCache[fen])
                    return $.Deferred().resolve(masterCache[fen]).promise();
                return xhr.opening(opts.endpoint, 'standard', fen, {
                    db: {
                        selected: common_1.prop('masters')
                    }
                }, false).then((res) => {
                    masterCache[fen] = res;
                    return res;
                });
            };
        })(),
        fetchTablebaseHit(fen) {
            return xhr.tablebase(opts.tablebaseEndpoint, effectiveVariant, fen).then((res) => {
                const move = res.moves[0];
                if (move && move.dtz == null)
                    throw 'unknown tablebase position';
                return {
                    fen: fen,
                    best: move && move.uci,
                    winner: res.checkmate ? util_1.opposite(explorerUtil_1.colorOf(fen)) : (res.stalemate ? undefined : explorerUtil_1.winnerOf(fen, move))
                };
            });
        }
    };
}
exports.default = default_1;
;

},{"./explorerConfig":50,"./explorerUtil":52,"./explorerXhr":54,"chessground/util":18,"common":131,"common/storage":135,"game":138}],52:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function colorOf(fen) {
    return fen.split(' ')[1] === 'w' ? 'white' : 'black';
}
exports.colorOf = colorOf;
function winnerOf(fen, move) {
    const stm = fen.split(' ')[1];
    if ((stm[0] == 'w' && move.wdl < 0) || (stm[0] == 'b' && move.wdl > 0))
        return 'white';
    if ((stm[0] == 'b' && move.wdl < 0) || (stm[0] == 'w' && move.wdl > 0))
        return 'black';
}
exports.winnerOf = winnerOf;

},{}],53:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const explorerConfig_1 = require("./explorerConfig");
const util_1 = require("../util");
const explorerUtil_1 = require("./explorerUtil");
const interfaces_1 = require("./interfaces");
function resultBar(move) {
    const sum = move.white + move.draws + move.black;
    function section(key) {
        const percent = move[key] * 100 / sum;
        return percent === 0 ? null : snabbdom_1.h('span.' + key, {
            attrs: { style: 'width: ' + (Math.round(move[key] * 1000 / sum) / 10) + '%' },
        }, percent > 12 ? Math.round(percent) + (percent > 20 ? '%' : '') : '');
    }
    return snabbdom_1.h('div.bar', ['white', 'draws', 'black'].map(section));
}
let lastShow;
function moveTableAttributes(ctrl, fen) {
    return {
        attrs: { 'data-fen': fen },
        hook: {
            insert: vnode => {
                const el = vnode.elm;
                el.addEventListener('mouseover', e => {
                    ctrl.explorer.setHovering($(el).attr('data-fen'), $(e.target).parents('tr').attr('data-uci'));
                });
                el.addEventListener('mouseout', _ => {
                    ctrl.explorer.setHovering($(el).attr('data-fen'), null);
                });
                el.addEventListener('mousedown', e => {
                    const uci = $(e.target).parents('tr').attr('data-uci');
                    if (uci)
                        ctrl.explorerMove(uci);
                });
            },
            postpatch: (_, vnode) => {
                setTimeout(() => {
                    const el = vnode.elm;
                    ctrl.explorer.setHovering($(el).attr('data-fen'), $(el).find('tr:hover').attr('data-uci'));
                }, 100);
            }
        }
    };
}
function showMoveTable(ctrl, moves, fen) {
    if (!moves.length)
        return null;
    const trans = ctrl.trans.noarg;
    return snabbdom_1.h('table.moves', [
        snabbdom_1.h('thead', [
            snabbdom_1.h('tr', [
                snabbdom_1.h('th.title', trans('move')),
                snabbdom_1.h('th.title', trans('games')),
                snabbdom_1.h('th.title', trans('whiteDrawBlack'))
            ])
        ]),
        snabbdom_1.h('tbody', moveTableAttributes(ctrl, fen), moves.map(move => {
            return snabbdom_1.h('tr', {
                key: move.uci,
                attrs: {
                    'data-uci': move.uci,
                    title: ctrl.trans('averageRatingX', move.averageRating)
                }
            }, [
                snabbdom_1.h('td', move.san[0] === 'P' ? move.san.slice(1) : move.san),
                snabbdom_1.h('td', window.lichess.numberFormat(move.white + move.draws + move.black)),
                snabbdom_1.h('td', resultBar(move))
            ]);
        }))
    ]);
}
function showResult(winner) {
    if (winner === 'white')
        return snabbdom_1.h('result.white', '1-0');
    if (winner === 'black')
        return snabbdom_1.h('result.black', '0-1');
    return snabbdom_1.h('result.draws', '½-½');
}
function showGameTable(ctrl, title, games) {
    if (!ctrl.explorer.withGames || !games.length)
        return null;
    const openedId = ctrl.explorer.gameMenu();
    return snabbdom_1.h('table.games', [
        snabbdom_1.h('thead', [
            snabbdom_1.h('tr', [
                snabbdom_1.h('th.title', { attrs: { colspan: 4 } }, title)
            ])
        ]),
        snabbdom_1.h('tbody', {
            hook: util_1.bind('click', e => {
                const $tr = $(e.target).parents('tr');
                if (!$tr.length)
                    return;
                const id = $tr.data('id');
                if (ctrl.study && ctrl.study.members.canContribute()) {
                    ctrl.explorer.gameMenu(id);
                    ctrl.redraw();
                }
                else
                    openGame(ctrl, id);
            })
        }, games.map(game => {
            return openedId === game.id ? gameActions(ctrl, game) : snabbdom_1.h('tr', {
                key: game.id,
                attrs: { 'data-id': game.id }
            }, [
                snabbdom_1.h('td', [game.white, game.black].map(p => snabbdom_1.h('span', '' + p.rating))),
                snabbdom_1.h('td', [game.white, game.black].map(p => snabbdom_1.h('span', p.name))),
                snabbdom_1.h('td', showResult(game.winner)),
                snabbdom_1.h('td', [game.year])
            ]);
        }))
    ]);
}
function openGame(ctrl, gameId) {
    const orientation = ctrl.chessground.state.orientation, fenParam = ctrl.node.ply > 0 ? ('?fen=' + ctrl.node.fen) : '';
    let url = '/' + gameId + '/' + orientation + fenParam;
    if (ctrl.explorer.config.data.db.selected() === 'masters')
        url = '/import/master' + url;
    window.open(url, '_blank');
}
function gameActions(ctrl, game) {
    function send(insert) {
        ctrl.study.explorerGame(game.id, insert);
        ctrl.explorer.gameMenu(null);
        ctrl.redraw();
    }
    return snabbdom_1.h('tr', {
        key: game.id + '-m',
    }, [
        snabbdom_1.h('td.game_menu', {
            attrs: { colspan: 4 },
        }, [
            snabbdom_1.h('div.game_title', `${game.white.name} - ${game.black.name}, ${showResult(game.winner).text}, ${game.year}`),
            snabbdom_1.h('div.menu', [
                snabbdom_1.h('a.text', {
                    attrs: util_1.dataIcon('v'),
                    hook: util_1.bind('click', _ => openGame(ctrl, game.id))
                }, 'View'),
                ...(ctrl.study ? [
                    snabbdom_1.h('a.text', {
                        attrs: util_1.dataIcon('c'),
                        hook: util_1.bind('click', _ => send(false), ctrl.redraw)
                    }, 'Cite'),
                    snabbdom_1.h('a.text', {
                        attrs: util_1.dataIcon('O'),
                        hook: util_1.bind('click', _ => send(true), ctrl.redraw)
                    }, 'Insert')
                ] : []),
                snabbdom_1.h('a.text', {
                    attrs: util_1.dataIcon('L'),
                    hook: util_1.bind('click', _ => ctrl.explorer.gameMenu(null), ctrl.redraw)
                }, 'Close')
            ])
        ])
    ]);
}
function showTablebase(ctrl, title, moves, fen) {
    if (!moves.length)
        return [];
    return [
        snabbdom_1.h('div.title', title),
        snabbdom_1.h('table.tablebase', [
            snabbdom_1.h('tbody', moveTableAttributes(ctrl, fen), moves.map(move => {
                return snabbdom_1.h('tr', {
                    key: move.uci,
                    attrs: { 'data-uci': move.uci }
                }, [
                    snabbdom_1.h('td', move.san),
                    snabbdom_1.h('td', [showDtz(ctrl, fen, move), showDtm(ctrl, fen, move)])
                ]);
            }))
        ])
    ];
}
function showDtm(ctrl, fen, move) {
    if (move.dtm)
        return snabbdom_1.h('result.' + explorerUtil_1.winnerOf(fen, move), {
            attrs: {
                title: ctrl.trans.plural('mateInXHalfMoves', Math.abs(move.dtm)) + ' (Depth To Mate)'
            }
        }, 'DTM ' + Math.abs(move.dtm));
}
function showDtz(ctrl, fen, move) {
    const trans = ctrl.trans.noarg;
    if (move.checkmate)
        return snabbdom_1.h('result.' + explorerUtil_1.winnerOf(fen, move), trans('checkmate'));
    else if (move.stalemate)
        return snabbdom_1.h('result.draws', trans('stalemate'));
    else if (move.variant_win)
        return snabbdom_1.h('result.' + explorerUtil_1.winnerOf(fen, move), trans('variantLoss'));
    else if (move.variant_loss)
        return snabbdom_1.h('result.' + explorerUtil_1.winnerOf(fen, move), trans('variantWin'));
    else if (move.insufficient_material)
        return snabbdom_1.h('result.draws', trans('insufficientMaterial'));
    else if (move.dtz === null)
        return null;
    else if (move.dtz === 0)
        return snabbdom_1.h('result.draws', trans('draw'));
    else if (move.zeroing)
        return move.san.includes('x') ?
            snabbdom_1.h('result.' + explorerUtil_1.winnerOf(fen, move), trans('capture')) :
            snabbdom_1.h('result.' + explorerUtil_1.winnerOf(fen, move), trans('pawnMove'));
    return snabbdom_1.h('result.' + explorerUtil_1.winnerOf(fen, move), {
        attrs: {
            title: ctrl.trans.plural('nextCaptureOrPawnMoveInXHalfMoves', Math.abs(move.dtz))
        }
    }, 'DTZ ' + Math.abs(move.dtz));
}
function closeButton(ctrl) {
    return snabbdom_1.h('button.button.button-empty.text', {
        attrs: util_1.dataIcon('L'),
        hook: util_1.bind('click', ctrl.toggleExplorer, ctrl.redraw)
    }, ctrl.trans.noarg('close'));
}
function showEmpty(ctrl) {
    return snabbdom_1.h('div.data.empty', [
        snabbdom_1.h('div.title', showTitle(ctrl, ctrl.data.game.variant)),
        snabbdom_1.h('div.message', [
            snabbdom_1.h('strong', ctrl.trans.noarg('noGameFound')),
            ctrl.explorer.config.fullHouse() ?
                null :
                snabbdom_1.h('p.explanation', ctrl.trans.noarg('maybeIncludeMoreGamesFromThePreferencesMenu')),
            closeButton(ctrl)
        ])
    ]);
}
function showGameEnd(ctrl, title) {
    return snabbdom_1.h('div.data.empty', [
        snabbdom_1.h('div.title', ctrl.trans.noarg('gameOver')),
        snabbdom_1.h('div.message', [
            snabbdom_1.h('i', { attrs: util_1.dataIcon('') }),
            snabbdom_1.h('h3', title),
            closeButton(ctrl)
        ])
    ]);
}
function show(ctrl) {
    const trans = ctrl.trans.noarg, data = ctrl.explorer.current();
    if (data && interfaces_1.isOpening(data)) {
        const moveTable = showMoveTable(ctrl, data.moves, data.fen), recentTable = showGameTable(ctrl, trans('recentGames'), data.recentGames || []), topTable = showGameTable(ctrl, trans('topGames'), data.topGames || []);
        if (moveTable || recentTable || topTable)
            lastShow = snabbdom_1.h('div.data', [moveTable, topTable, recentTable]);
        else
            lastShow = showEmpty(ctrl);
    }
    else if (data && interfaces_1.isTablebase(data)) {
        const moves = data.moves;
        if (moves.length)
            lastShow = snabbdom_1.h('div.data', [
                [trans('winning'), m => m.wdl === -2],
                [trans('unknown'), m => m.wdl === null],
                [trans('winPreventedBy50MoveRule'), m => m.wdl === -1],
                [trans('drawn'), m => m.wdl === 0],
                [trans('lossSavedBy50MoveRule'), m => m.wdl === 1],
                [trans('losing'), m => m.wdl === 2],
            ]
                .map(a => showTablebase(ctrl, a[0], moves.filter(a[1]), data.fen))
                .reduce(function (a, b) { return a.concat(b); }, []));
        else if (data.checkmate)
            lastShow = showGameEnd(ctrl, trans('checkmate'));
        else if (data.stalemate)
            lastShow = showGameEnd(ctrl, trans('stalemate'));
        else if (data.variant_win || data.variant_loss)
            lastShow = showGameEnd(ctrl, trans('variantEnding'));
        else
            lastShow = showEmpty(ctrl);
    }
    return lastShow;
}
function showTitle(ctrl, variant) {
    if (variant.key === 'standard' || variant.key === 'fromPosition')
        return ctrl.trans.noarg('openingExplorer');
    return ctrl.trans('xOpeningExplorer', variant.name);
}
function showConfig(ctrl) {
    return snabbdom_1.h('div.config', [
        snabbdom_1.h('div.title', showTitle(ctrl, ctrl.data.game.variant))
    ].concat(explorerConfig_1.view(ctrl.explorer.config)));
}
function showFailing(ctrl) {
    return snabbdom_1.h('div.data.empty', [
        snabbdom_1.h('div.title', showTitle(ctrl, ctrl.data.game.variant)),
        snabbdom_1.h('div.failing.message', [
            snabbdom_1.h('h3', "Oops, sorry!"),
            snabbdom_1.h('p.explanation', "The explorer is temporarily out of service. Try again soon!"),
            closeButton(ctrl)
        ])
    ]);
}
let lastFen = '';
function default_1(ctrl) {
    const explorer = ctrl.explorer;
    if (!explorer.enabled())
        return;
    const data = explorer.current(), config = explorer.config, configOpened = config.data.open(), loading = !configOpened && (explorer.loading() || (!data && !explorer.failing())), content = configOpened ? showConfig(ctrl) : (explorer.failing() ? showFailing(ctrl) : show(ctrl));
    return snabbdom_1.h('section.explorer-box.sub-box', {
        class: {
            loading,
            config: configOpened,
            reduced: !configOpened && (explorer.failing() || explorer.movesAway() > 2)
        },
        hook: {
            insert: vnode => vnode.elm.scrollTop = 0,
            postpatch(_, vnode) {
                if (!data || lastFen === data.fen)
                    return;
                vnode.elm.scrollTop = 0;
                lastFen = data.fen;
            }
        }
    }, [
        snabbdom_1.h('div.overlay'),
        content, (!content || explorer.failing()) ? null : snabbdom_1.h('span.toconf', {
            attrs: util_1.dataIcon(configOpened ? 'L' : '%'),
            hook: util_1.bind('click', () => ctrl.explorer.config.toggleOpen(), ctrl.redraw)
        })
    ]);
}
exports.default = default_1;
;

},{"../util":110,"./explorerConfig":50,"./explorerUtil":52,"./interfaces":55,"snabbdom":35}],54:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function opening(endpoint, variant, fen, config, withGames) {
    let url;
    const params = {
        fen,
        moves: 12
    };
    if (!withGames)
        params.topGames = params.recentGames = 0;
    if (config.db.selected() === 'masters')
        url = '/master';
    else {
        url = '/lichess';
        params['variant'] = variant;
        params['speeds[]'] = config.speed.selected();
        params['ratings[]'] = config.rating.selected();
    }
    return $.ajax({
        url: endpoint + url,
        data: params,
        cache: true
    }).then((data) => {
        data.opening = true;
        data.fen = fen;
        return data;
    });
}
exports.opening = opening;
function tablebase(endpoint, variant, fen) {
    const effectiveVariant = (variant === 'fromPosition' || variant === 'chess960') ? 'standard' : variant;
    return $.ajax({
        url: endpoint + '/' + effectiveVariant,
        data: { fen },
        cache: true
    }).then((data) => {
        data.tablebase = true;
        data.fen = fen;
        return data;
    });
}
exports.tablebase = tablebase;

},{}],55:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function isOpening(m) {
    return !!m.opening;
}
exports.isOpening = isOpening;
function isTablebase(m) {
    return !!m.tablebase;
}
exports.isTablebase = isTablebase;

},{}],56:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("common");
function make(cfg, data, redraw) {
    const saveUrl = `/${data.game.id}${data.player.id}/forecasts`;
    let forecasts = cfg.steps || [];
    const loading = common_1.prop(false);
    function keyOf(fc) {
        return fc.map(node => node.ply + ':' + node.uci).join(',');
    }
    function contains(fc1, fc2) {
        return fc1.length >= fc2.length && keyOf(fc1).startsWith(keyOf(fc2));
    }
    function findStartingWithNode(node) {
        return forecasts.filter(function (fc) {
            return contains(fc, [node]);
        });
    }
    function collides(fc1, fc2) {
        for (var i = 0, max = Math.min(fc1.length, fc2.length); i < max; i++) {
            if (fc1[i].uci !== fc2[i].uci) {
                if (cfg.onMyTurn)
                    return i !== 0 && i % 2 === 0;
                return i % 2 === 1;
            }
        }
        return true;
    }
    function truncate(fc) {
        if (cfg.onMyTurn)
            return (fc.length % 2 !== 1 ? fc.slice(0, -1) : fc).slice(0, 30);
        // must end with player move
        return (fc.length % 2 !== 0 ? fc.slice(0, -1) : fc).slice(0, 30);
    }
    function isLongEnough(fc) {
        return fc.length >= (cfg.onMyTurn ? 1 : 2);
    }
    function fixAll() {
        // remove contained forecasts
        forecasts = forecasts.filter(function (fc, i) {
            return forecasts.filter(function (f, j) {
                return i !== j && contains(f, fc);
            }).length === 0;
        });
        // remove colliding forecasts
        forecasts = forecasts.filter(function (fc, i) {
            return forecasts.filter(function (f, j) {
                return i < j && collides(f, fc);
            }).length === 0;
        });
    }
    fixAll();
    function reloadToLastPly() {
        loading(true);
        redraw();
        history.replaceState(null, '', '#last');
        window.lichess.reload();
    }
    ;
    function isCandidate(fc) {
        fc = truncate(fc);
        if (!isLongEnough(fc))
            return false;
        var collisions = forecasts.filter(function (f) {
            return contains(f, fc);
        });
        if (collisions.length)
            return false;
        return true;
    }
    ;
    function save() {
        if (cfg.onMyTurn)
            return;
        loading(true);
        redraw();
        $.ajax({
            method: 'POST',
            url: saveUrl,
            data: JSON.stringify(forecasts),
            contentType: 'application/json'
        }).then(function (data) {
            if (data.reload)
                reloadToLastPly();
            else {
                loading(false);
                forecasts = data.steps || [];
            }
            redraw();
        });
    }
    ;
    function playAndSave(node) {
        if (!cfg.onMyTurn)
            return;
        loading(true);
        redraw();
        $.ajax({
            method: 'POST',
            url: saveUrl + '/' + node.uci,
            data: JSON.stringify(findStartingWithNode(node).filter(function (fc) {
                return fc.length > 1;
            }).map(function (fc) {
                return fc.slice(1);
            })),
            contentType: 'application/json'
        }).then(function (data) {
            if (data.reload)
                reloadToLastPly();
            else {
                loading(false);
                forecasts = data.steps || [];
            }
            redraw();
        });
    }
    return {
        addNodes(fc) {
            fc = truncate(fc);
            if (!isCandidate(fc))
                return;
            forecasts.push(fc);
            fixAll();
            save();
        },
        isCandidate,
        removeIndex(index) {
            forecasts = forecasts.filter((_, i) => i !== index);
            save();
        },
        list: () => forecasts,
        truncate,
        loading,
        onMyTurn: !!cfg.onMyTurn,
        findStartingWithNode,
        playAndSave,
        reloadToLastPly
    };
}
exports.make = make;

},{"common":131}],57:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const pgnExport_1 = require("../pgnExport");
const util_1 = require("../util");
const chess_1 = require("chess");
function onMyTurn(ctrl, fctrl, cNodes) {
    var firstNode = cNodes[0];
    if (!firstNode)
        return;
    var fcs = fctrl.findStartingWithNode(firstNode);
    if (!fcs.length)
        return;
    var lines = fcs.filter(function (fc) {
        return fc.length > 1;
    });
    return snabbdom_1.h('button.on-my-turn.button.text', {
        attrs: util_1.dataIcon('E'),
        hook: util_1.bind('click', _ => fctrl.playAndSave(firstNode))
    }, [
        snabbdom_1.h('span', [
            snabbdom_1.h('strong', ctrl.trans('playX', chess_1.fixCrazySan(cNodes[0].san))),
            lines.length ?
                snabbdom_1.h('span', ctrl.trans.plural('andSaveNbPremoveLines', lines.length)) :
                snabbdom_1.h('span', ctrl.trans.noarg('noConditionalPremoves'))
        ])
    ]);
}
function makeCnodes(ctrl, fctrl) {
    const afterPly = ctrl.tree.getCurrentNodesAfterPly(ctrl.nodeList, ctrl.mainline, ctrl.data.game.turns);
    return fctrl.truncate(afterPly.map(node => ({
        ply: node.ply,
        fen: node.fen,
        uci: node.uci,
        san: node.san,
        check: node.check
    })));
}
function default_1(ctrl, fctrl) {
    const cNodes = makeCnodes(ctrl, fctrl);
    const isCandidate = fctrl.isCandidate(cNodes);
    return snabbdom_1.h('div.forecast', {
        class: { loading: fctrl.loading() }
    }, [
        fctrl.loading() ? snabbdom_1.h('div.overlay', util_1.spinner()) : null,
        snabbdom_1.h('div.box', [
            snabbdom_1.h('div.top', ctrl.trans.noarg('conditionalPremoves')),
            snabbdom_1.h('div.list', fctrl.list().map(function (nodes, i) {
                return snabbdom_1.h('div.entry.text', {
                    attrs: util_1.dataIcon('G')
                }, [
                    snabbdom_1.h('a.del', {
                        hook: util_1.bind('click', e => {
                            fctrl.removeIndex(i);
                            e.stopPropagation();
                        }, ctrl.redraw)
                    }, 'x'),
                    snabbdom_1.h('sans', pgnExport_1.renderNodesHtml(nodes))
                ]);
            })),
            snabbdom_1.h('button.add.text', {
                class: { enabled: isCandidate },
                attrs: util_1.dataIcon(isCandidate ? 'O' : ""),
                hook: util_1.bind('click', _ => fctrl.addNodes(makeCnodes(ctrl, fctrl)), ctrl.redraw)
            }, [
                isCandidate ? snabbdom_1.h('span', [
                    snabbdom_1.h('span', ctrl.trans.noarg('addCurrentVariation')),
                    snabbdom_1.h('sans', pgnExport_1.renderNodesHtml(cNodes))
                ]) :
                    snabbdom_1.h('span', ctrl.trans.noarg('playVariationToCreateConditionalPremoves'))
            ])
        ]),
        fctrl.onMyTurn ? onMyTurn(ctrl, fctrl, cNodes) : null
    ]);
}
exports.default = default_1;

},{"../pgnExport":66,"../util":110,"chess":129,"snabbdom":35}],58:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const moveView_1 = require("./moveView");
const common_1 = require("common");
const util_1 = require("./util");
function make(root) {
    let prev;
    let selected = 0;
    function displayed() {
        return root.node.children.length > 1;
    }
    ;
    return {
        state() {
            const node = root.node;
            if (!prev || prev.id !== node.id) {
                prev = node;
                selected = 0;
            }
            return {
                node,
                selected,
                displayed: displayed()
            };
        },
        next() {
            if (displayed()) {
                selected = Math.min(root.node.children.length - 1, selected + 1);
                return true;
            }
        },
        prev() {
            if (displayed()) {
                selected = Math.max(0, selected - 1);
                return true;
            }
        },
        proceed(it) {
            if (displayed()) {
                it = common_1.defined(it) ? it : selected;
                root.userJumpIfCan(root.path + root.node.children[it].id);
                return true;
            }
        }
    };
}
exports.make = make;
function view(root, concealOf) {
    if (root.embed || root.retro)
        return;
    const state = root.fork.state();
    if (!state.displayed)
        return;
    const isMainline = concealOf && root.onMainline;
    return snabbdom_1.h('div.analyse__fork', {
        hook: util_1.onInsert(el => {
            el.addEventListener('click', e => {
                const target = e.target, it = parseInt(target.parentNode.getAttribute('data-it') ||
                    target.getAttribute('data-it') || '');
                root.fork.proceed(it);
                root.redraw();
            });
        })
    }, state.node.children.map((node, it) => {
        const conceal = isMainline && concealOf(true)(root.path + node.id, node);
        if (!conceal)
            return snabbdom_1.h('move', {
                class: { selected: it === state.selected },
                attrs: { 'data-it': it }
            }, moveView_1.renderIndexAndMove({
                withDots: true,
                showEval: root.showComputer(),
                showGlyphs: root.showComputer()
            }, node));
    }));
}
exports.view = view;

},{"./moveView":64,"./util":110,"common":131,"snabbdom":35}],59:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gridHacks = require("common/gridHacks");
let booted = false;
function start(container) {
    // Chrome, Chromium, Brave, Opera, Safari 12+ are OK
    if (window.chrome)
        return;
    const runHacks = () => {
        if (gridHacks.needsBoardHeightFix())
            gridHacks.fixMainBoardHeight(container);
        fixChatHeight(container);
    };
    gridHacks.runner(runHacks);
    gridHacks.bindChessgroundResizeOnce(runHacks);
    if (!booted) {
        window.lichess.pubsub.on('chat.resize', runHacks);
        booted = true;
    }
}
exports.start = start;
function fixChatHeight(container) {
    const chat = container.querySelector('.mchat'), board = container.querySelector('.analyse__board .cg-wrap'), side = container.querySelector('.analyse__side');
    if (chat && board && side) {
        const height = board.offsetHeight - side.offsetHeight;
        if (height)
            chat.style.height = `calc(${height}px - 2vmin)`;
    }
}

},{"common/gridHacks":132}],60:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const chessground_1 = require("chessground");
const resize_1 = require("common/resize");
function render(ctrl) {
    return snabbdom_1.h('div.cg-wrap.cgv' + ctrl.cgVersion.js, {
        hook: {
            insert: vnode => {
                ctrl.chessground = chessground_1.Chessground(vnode.elm, makeConfig(ctrl));
                ctrl.setAutoShapes();
                if (ctrl.node.shapes)
                    ctrl.chessground.setShapes(ctrl.node.shapes);
                ctrl.cgVersion.dom = ctrl.cgVersion.js;
            },
            destroy: _ => ctrl.chessground.destroy()
        }
    });
}
exports.render = render;
function promote(ground, key, role) {
    const pieces = {};
    const piece = ground.state.pieces[key];
    if (piece && piece.role == 'pawn') {
        pieces[key] = {
            color: piece.color,
            role,
            promoted: true
        };
        ground.setPieces(pieces);
    }
}
exports.promote = promote;
function makeConfig(ctrl) {
    const d = ctrl.data, pref = d.pref, opts = ctrl.makeCgOpts();
    const config = {
        turnColor: opts.turnColor,
        fen: opts.fen,
        check: opts.check,
        lastMove: opts.lastMove,
        orientation: ctrl.bottomColor(),
        coordinates: pref.coords !== 0 && !ctrl.embed,
        addPieceZIndex: pref.is3d,
        viewOnly: !!ctrl.embed,
        movable: {
            free: false,
            color: opts.movable.color,
            dests: opts.movable.dests,
            showDests: pref.destination,
            rookCastle: pref.rookCastle
        },
        events: {
            move: ctrl.userMove,
            dropNewPiece: ctrl.userNewPiece,
            insert(elements) {
                if (!ctrl.embed)
                    resize_1.default(elements, ctrl.data.pref.resizeHandle, ctrl.node.ply);
            }
        },
        premovable: {
            enabled: opts.premovable.enabled,
            showDests: pref.destination,
            events: {
                set: ctrl.onPremoveSet
            }
        },
        drawable: {
            enabled: !ctrl.embed,
            eraseOnClick: !ctrl.opts.study || !!ctrl.opts.practice
        },
        highlight: {
            lastMove: pref.highlight,
            check: pref.highlight
        },
        animation: {
            duration: pref.animationDuration
        },
        disableContextMenu: true
    };
    ctrl.study && ctrl.study.mutateCgConfig(config);
    return config;
}
exports.makeConfig = makeConfig;

},{"chessground":5,"common/resize":134,"snabbdom":35}],61:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const control = require("./control");
const util_1 = require("./util");
const modal_1 = require("./modal");
const snabbdom_1 = require("snabbdom");
const preventing = (f) => (e) => {
    e.preventDefault();
    f();
};
function bind(ctrl) {
    if (!window.Mousetrap)
        return;
    const kbd = window.Mousetrap;
    kbd.bind(['left', 'k'], preventing(function () {
        control.prev(ctrl);
        ctrl.redraw();
    }));
    kbd.bind(['shift+left', 'shift+k'], preventing(function () {
        control.exitVariation(ctrl);
        ctrl.redraw();
    }));
    kbd.bind(['right', 'j'], preventing(function () {
        if (!ctrl.fork.proceed())
            control.next(ctrl);
        ctrl.redraw();
    }));
    kbd.bind(['shift+right', 'shift+j'], preventing(function () {
        control.enterVariation(ctrl);
        ctrl.redraw();
    }));
    kbd.bind(['up', '0'], preventing(function () {
        if (!ctrl.fork.prev())
            control.first(ctrl);
        ctrl.redraw();
    }));
    kbd.bind(['down', '$'], preventing(function () {
        if (!ctrl.fork.next())
            control.last(ctrl);
        ctrl.redraw();
    }));
    kbd.bind('shift+c', preventing(function () {
        ctrl.showComments = !ctrl.showComments;
        ctrl.autoScroll();
        ctrl.redraw();
    }));
    kbd.bind('shift+i', preventing(function () {
        ctrl.treeView.toggle();
        ctrl.redraw();
    }));
    kbd.bind('z', preventing(function () {
        ctrl.toggleComputer();
        ctrl.redraw();
    }));
    if (ctrl.embed)
        return;
    kbd.bind('space', preventing(function () {
        const gb = ctrl.gamebookPlay();
        if (gb)
            gb.onSpace();
        else if (ctrl.studyPractice)
            return;
        else if (ctrl.ceval.enabled())
            ctrl.playBestMove();
        else
            ctrl.toggleCeval();
    }));
    if (ctrl.studyPractice)
        return;
    kbd.bind('f', preventing(ctrl.flip));
    kbd.bind('?', preventing(function () {
        ctrl.keyboardHelp = !ctrl.keyboardHelp;
        ctrl.redraw();
    }));
    kbd.bind('l', preventing(ctrl.toggleCeval));
    kbd.bind('a', preventing(function () {
        ctrl.toggleAutoShapes(!ctrl.showAutoShapes());
        ctrl.redraw();
    }));
    kbd.bind('x', preventing(ctrl.toggleThreatMode));
    kbd.bind('e', preventing(function () {
        ctrl.toggleExplorer();
        ctrl.redraw();
    }));
    if (ctrl.study) {
        const keyToMousedown = (key, selector) => {
            kbd.bind(key, preventing(function () {
                $(selector).each(function () {
                    window.lichess.dispatchEvent(this, 'mousedown');
                });
            }));
        };
        keyToMousedown('d', '.study__buttons .comments');
        keyToMousedown('g', '.study__buttons .glyphs');
    }
}
exports.bind = bind;
function view(ctrl) {
    return modal_1.modal({
        class: 'keyboard-help',
        onInsert(el) {
            window.lichess.loadCssPath('analyse.keyboard');
            $(el).find('.scrollable').load('/analysis/help?study=' + (ctrl.study ? 1 : 0));
        },
        onClose() {
            ctrl.keyboardHelp = false;
            ctrl.redraw();
        },
        content: [
            snabbdom_1.h('div.scrollable', util_1.spinner())
        ]
    });
}
exports.view = view;

},{"./control":45,"./modal":63,"./util":110,"snabbdom":35}],62:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ctrl_1 = require("./ctrl");
const view_1 = require("./view");
const boot_1 = require("./boot");
exports.boot = boot_1.default;
const chessground_1 = require("chessground");
const chat = require("chat");
const snabbdom_1 = require("snabbdom");
const class_1 = require("snabbdom/modules/class");
const attributes_1 = require("snabbdom/modules/attributes");
const menuHover_1 = require("common/menuHover");
menuHover_1.menuHover();
exports.patch = snabbdom_1.init([class_1.default, attributes_1.default]);
function start(opts) {
    opts.element = document.querySelector('main.analyse');
    let vnode, ctrl;
    function redraw() {
        vnode = exports.patch(vnode, view_1.default(ctrl));
    }
    ctrl = new ctrl_1.default(opts, redraw);
    const blueprint = view_1.default(ctrl);
    opts.element.innerHTML = '';
    vnode = exports.patch(opts.element, blueprint);
    return {
        socketReceive: ctrl.socket.receive,
        path: () => ctrl.path,
        setChapter(id) {
            if (ctrl.study)
                ctrl.study.setChapter(id);
        }
    };
}
exports.start = start;
// that's for the rest of lichess to access chessground
// without having to include it a second time
window.Chessground = chessground_1.Chessground;
window.LichessChat = chat;

},{"./boot":43,"./ctrl":48,"./view":111,"chat":121,"chessground":5,"common/menuHover":133,"snabbdom":35,"snabbdom/modules/attributes":33,"snabbdom/modules/class":34}],63:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const util_1 = require("./util");
function modal(d) {
    return snabbdom_1.h('div#modal-overlay', {
        hook: util_1.bind('click', d.onClose)
    }, [
        snabbdom_1.h('div#modal-wrap.study__modal.' + d.class, {
            hook: util_1.onInsert(el => {
                el.addEventListener('click', e => e.stopPropagation());
                d.onInsert && d.onInsert(el);
            })
        }, [
            snabbdom_1.h('span.close', {
                attrs: { 'data-icon': 'L' },
                hook: util_1.bind('click', d.onClose)
            }),
            snabbdom_1.h('div', d.content)
        ])
    ]);
}
exports.modal = modal;
function button(name) {
    return snabbdom_1.h('div.form-actions.single', snabbdom_1.h('button.button', {
        attrs: { type: 'submit' },
    }, name));
}
exports.button = button;

},{"./util":110,"snabbdom":35}],64:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const chess_1 = require("chess");
const common_1 = require("common");
const ceval_1 = require("ceval");
function plyToTurn(ply) {
    return Math.floor((ply - 1) / 2) + 1;
}
exports.plyToTurn = plyToTurn;
function renderGlyphs(glyphs) {
    return glyphs.map(glyph => snabbdom_1.h('glyph', {
        attrs: { title: glyph.name }
    }, glyph.symbol));
}
exports.renderGlyphs = renderGlyphs;
function renderEval(e) {
    return snabbdom_1.h('eval', e);
}
function renderIndexText(ply, withDots) {
    return plyToTurn(ply) + (withDots ? (ply % 2 === 1 ? '.' : '...') : '');
}
exports.renderIndexText = renderIndexText;
function renderIndex(ply, withDots) {
    return snabbdom_1.h('index', renderIndexText(ply, withDots));
}
exports.renderIndex = renderIndex;
function renderMove(ctx, node) {
    const ev = ceval_1.view.getBestEval({ client: node.ceval, server: node.eval }) || {};
    return [snabbdom_1.h('san', chess_1.fixCrazySan(node.san))]
        .concat((node.glyphs && ctx.showGlyphs) ? renderGlyphs(node.glyphs) : [])
        .concat(ctx.showEval ? (common_1.defined(ev.cp) ? [renderEval(chess_1.renderEval(ev.cp))] : (common_1.defined(ev.mate) ? [renderEval('#' + ev.mate)] : [])) : []);
}
exports.renderMove = renderMove;
function renderIndexAndMove(ctx, node) {
    if (!node.san)
        return; // initial position
    return [renderIndex(node.ply, ctx.withDots), ...renderMove(ctx, node)];
}
exports.renderIndexAndMove = renderIndexAndMove;

},{"ceval":113,"chess":129,"common":131,"snabbdom":35}],65:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ceval_1 = require("ceval");
const common_1 = require("common");
function hasCompChild(node) {
    return !!node.children.find(function (c) {
        return !!c.comp;
    });
}
function nextGlyphSymbol(color, symbol, mainline, fromPly) {
    const len = mainline.length;
    if (!len)
        return;
    const fromIndex = fromPly - mainline[0].ply;
    for (var i = 1; i < len; i++) {
        const node = mainline[(fromIndex + i) % len];
        const found = (node.ply % 2 === (color === 'white' ? 1 : 0)) && node.glyphs && node.glyphs.find(function (g) {
            return g.symbol === symbol;
        });
        if (found)
            return node;
    }
    return;
}
exports.nextGlyphSymbol = nextGlyphSymbol;
function evalSwings(mainline, nodeFilter) {
    const found = [];
    const threshold = 0.1;
    for (var i = 1; i < mainline.length; i++) {
        var node = mainline[i];
        var prev = mainline[i - 1];
        if (nodeFilter(node) && node.eval && prev.eval) {
            var diff = Math.abs(ceval_1.winningChances.povDiff('white', prev.eval, node.eval));
            if (diff > threshold && hasCompChild(prev))
                found.push(node);
        }
    }
    return found;
}
exports.evalSwings = evalSwings;
function threefoldFen(fen) {
    return fen.split(' ').slice(0, 4).join(' ');
}
function detectThreefold(nodeList, node) {
    if (common_1.defined(node.threefold))
        return;
    const currentFen = threefoldFen(node.fen);
    let nbSimilarPositions = 0, i;
    for (i in nodeList)
        if (threefoldFen(nodeList[i].fen) === currentFen)
            nbSimilarPositions++;
    node.threefold = nbSimilarPositions > 2;
}
exports.detectThreefold = detectThreefold;
;

},{"ceval":113,"common":131}],66:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const chess_1 = require("chess");
function renderNodesTxt(nodes) {
    if (!nodes[0])
        return '';
    if (!nodes[0].san)
        nodes = nodes.slice(1);
    if (!nodes[0])
        return '';
    var s = nodes[0].ply % 2 === 1 ? '' : Math.floor((nodes[0].ply + 1) / 2) + '... ';
    nodes.forEach(function (node, i) {
        if (node.ply === 0)
            return;
        if (node.ply % 2 === 1)
            s += ((node.ply + 1) / 2) + '. ';
        else
            s += '';
        s += chess_1.fixCrazySan(node.san) + ((i + 9) % 8 === 0 ? '\n' : ' ');
    });
    return s.trim();
}
function renderFullTxt(ctrl) {
    var g = ctrl.data.game;
    var txt = renderNodesTxt(ctrl.tree.getNodeList(ctrl.path));
    var tags = [];
    if (g.variant.key !== 'standard')
        tags.push(['Variant', g.variant.name]);
    if (g.initialFen && g.initialFen !== chess_1.initialFen)
        tags.push(['FEN', g.initialFen]);
    if (tags.length)
        txt = tags.map(function (t) {
            return '[' + t[0] + ' "' + t[1] + '"]';
        }).join('\n') + '\n\n' + txt;
    return txt;
}
exports.renderFullTxt = renderFullTxt;
function renderNodesHtml(nodes) {
    if (!nodes[0])
        return [];
    if (!nodes[0].san)
        nodes = nodes.slice(1);
    if (!nodes[0])
        return [];
    const tags = [];
    if (nodes[0].ply % 2 === 0)
        tags.push(snabbdom_1.h('index', Math.floor((nodes[0].ply + 1) / 2) + '...'));
    nodes.forEach(node => {
        if (node.ply === 0)
            return;
        if (node.ply % 2 === 1)
            tags.push(snabbdom_1.h('index', ((node.ply + 1) / 2) + '.'));
        tags.push(snabbdom_1.h('san', chess_1.fixCrazySan(node.san)));
    });
    return tags;
}
exports.renderNodesHtml = renderNodesHtml;

},{"chess":129,"snabbdom":35}],67:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ceval_1 = require("ceval");
const tree_1 = require("tree");
const nodeFinder_1 = require("../nodeFinder");
const explorerCtrl_1 = require("../explorer/explorerCtrl");
const common_1 = require("common");
const util_1 = require("chessops/util");
const san_1 = require("chessops/san");
function make(root, playableDepth) {
    const variant = root.data.game.variant.key, running = common_1.prop(true), comment = common_1.prop(null), hovering = common_1.prop(null), hinting = common_1.prop(null), played = common_1.prop(false);
    function ensureCevalRunning() {
        if (!root.showComputer())
            root.toggleComputer();
        if (!root.ceval.enabled())
            root.toggleCeval();
        if (root.threatMode())
            root.toggleThreatMode();
    }
    function commentable(node, bonus = 0) {
        if (root.gameOver(node) || node.tbhit)
            return true;
        const ceval = node.ceval;
        return ceval ? ((ceval.depth + bonus) >= 15 || (ceval.depth >= 13 && ceval.millis > 3000)) : false;
    }
    function playable(node) {
        const ceval = node.ceval;
        return ceval ? (ceval.depth >= Math.min(ceval.maxDepth || 99, playableDepth()) ||
            (ceval.depth >= 15 && (ceval.cloud || ceval.millis > 5000))) : false;
    }
    ;
    const altCastles = {
        e1a1: 'e1c1',
        e1h1: 'e1g1',
        e8a8: 'e8c8',
        e8h8: 'e8g8'
    };
    function tbhitToEval(hit) {
        return hit && (hit.winner ? {
            mate: hit.winner === 'white' ? 10 : -10
        } : { cp: 0 });
    }
    function nodeBestUci(node) {
        return (node.tbhit && node.tbhit.best) || (node.ceval && node.ceval.pvs[0].moves[0]);
    }
    function makeComment(prev, node, path) {
        let verdict, best;
        const over = root.gameOver(node);
        if (over === 'checkmate')
            verdict = 'goodMove';
        else {
            const nodeEval = tbhitToEval(node.tbhit) || ((node.threefold || over === 'draw') ? { cp: 0 } : node.ceval);
            const prevEval = tbhitToEval(prev.tbhit) || prev.ceval;
            const shift = -ceval_1.winningChances.povDiff(root.bottomColor(), nodeEval, prevEval);
            best = nodeBestUci(prev);
            if (best === node.uci || best === altCastles[node.uci])
                best = null;
            if (!best)
                verdict = 'goodMove';
            else if (shift < 0.025)
                verdict = 'goodMove';
            else if (shift < 0.06)
                verdict = 'inaccuracy';
            else if (shift < 0.14)
                verdict = 'mistake';
            else
                verdict = 'blunder';
        }
        return {
            prev,
            node,
            path,
            verdict,
            best: best ? {
                uci: best,
                san: root.position(prev).unwrap(pos => san_1.makeSan(pos, util_1.parseUci(best)), _ => '--'),
            } : undefined
        };
    }
    function isMyTurn() {
        return root.turnColor() === root.bottomColor();
    }
    ;
    function checkCeval() {
        const node = root.node;
        if (!running()) {
            comment(null);
            return root.redraw();
        }
        if (explorerCtrl_1.tablebaseGuaranteed(variant, node.fen) && !common_1.defined(node.tbhit))
            return;
        ensureCevalRunning();
        if (isMyTurn()) {
            const h = hinting();
            if (h) {
                h.uci = nodeBestUci(node) || h.uci;
                root.setAutoShapes();
            }
        }
        else {
            comment(null);
            if (node.san && commentable(node)) {
                const parentNode = root.tree.parentNode(root.path);
                if (commentable(parentNode, +1))
                    comment(makeComment(parentNode, node, root.path));
                else {
                    /*
                     * Looks like the parent node didn't get enough analysis time
                     * to be commentable :-/ it can happen if the player premoves
                     * or just makes a move before the position is sufficiently analysed.
                     * In this case, fall back to comparing to the position before,
                     * Since computer moves are supposed to preserve eval anyway.
                     */
                    const olderNode = root.tree.parentNode(tree_1.path.init(root.path));
                    if (commentable(olderNode, +1))
                        comment(makeComment(olderNode, node, root.path));
                }
            }
            if (!played() && playable(node)) {
                root.playUci(nodeBestUci(node));
                played(true);
            }
            else
                root.redraw();
        }
    }
    ;
    function checkCevalOrTablebase() {
        if (explorerCtrl_1.tablebaseGuaranteed(variant, root.node.fen))
            root.explorer.fetchTablebaseHit(root.node.fen).then(hit => {
                if (hit && root.node.fen === hit.fen)
                    root.node.tbhit = hit;
                checkCeval();
            }, () => {
                if (!common_1.defined(root.node.tbhit))
                    root.node.tbhit = null;
                checkCeval();
            });
        else
            checkCeval();
    }
    function resume() {
        running(true);
        checkCevalOrTablebase();
    }
    window.lichess.requestIdleCallback(checkCevalOrTablebase);
    return {
        onCeval: checkCeval,
        onJump() {
            played(false);
            hinting(null);
            nodeFinder_1.detectThreefold(root.nodeList, root.node);
            checkCevalOrTablebase();
        },
        isMyTurn,
        comment,
        running,
        hovering,
        hinting,
        resume,
        playableDepth,
        reset() {
            comment(null);
            hinting(null);
        },
        preUserJump(from, to) {
            if (from !== to) {
                running(false);
                comment(null);
            }
        },
        postUserJump(from, to) {
            if (from !== to && isMyTurn())
                resume();
        },
        onUserMove() {
            running(true);
        },
        playCommentBest() {
            const c = comment();
            if (!c)
                return;
            root.jump(tree_1.path.init(c.path));
            if (c.best)
                root.playUci(c.best.uci);
        },
        commentShape(enable) {
            const c = comment();
            if (!enable || !c || !c.best)
                hovering(null);
            else
                hovering({
                    uci: c.best.uci
                });
            root.setAutoShapes();
        },
        hint() {
            const best = root.node.ceval ? root.node.ceval.pvs[0].moves[0] : null, prev = hinting();
            if (!best || (prev && prev.mode === 'move'))
                hinting(null);
            else
                hinting({
                    mode: prev ? 'move' : 'piece',
                    uci: best
                });
            root.setAutoShapes();
        },
        currentNode: () => root.node,
        bottomColor: root.bottomColor,
        redraw: root.redraw
    };
}
exports.make = make;
;

},{"../explorer/explorerCtrl":51,"../nodeFinder":65,"ceval":113,"chessops/san":24,"chessops/util":28,"common":131,"tree":142}],68:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("chessground/util");
const util_2 = require("../util");
const snabbdom_1 = require("snabbdom");
function commentBest(c, root, ctrl) {
    return c.best ? root.trans.vdom(c.verdict === 'goodMove' ? 'anotherWasX' : 'bestWasX', snabbdom_1.h('move', {
        hook: {
            insert: vnode => {
                const el = vnode.elm;
                el.addEventListener('click', ctrl.playCommentBest);
                el.addEventListener('mouseover', () => ctrl.commentShape(true));
                el.addEventListener('mouseout', () => ctrl.commentShape(false));
            },
            destroy: () => ctrl.commentShape(false)
        }
    }, c.best.san)) : [];
}
function renderOffTrack(root, ctrl) {
    return snabbdom_1.h('div.player.off', [
        snabbdom_1.h('div.icon.off', '!'),
        snabbdom_1.h('div.instruction', [
            snabbdom_1.h('strong', root.trans.noarg('youBrowsedAway')),
            snabbdom_1.h('div.choices', [
                snabbdom_1.h('a', { hook: util_2.bind('click', ctrl.resume, ctrl.redraw) }, root.trans.noarg('resumePractice'))
            ])
        ])
    ]);
}
function renderEnd(root, end) {
    const isMate = end === 'checkmate';
    const color = isMate ? util_1.opposite(root.turnColor()) : root.turnColor();
    return snabbdom_1.h('div.player', [
        color ? snabbdom_1.h('div.no-square', snabbdom_1.h('piece.king.' + color)) : snabbdom_1.h('div.icon.off', '!'),
        snabbdom_1.h('div.instruction', [
            snabbdom_1.h('strong', root.trans.noarg(end)),
            isMate ?
                snabbdom_1.h('em', snabbdom_1.h('color', root.trans.noarg(color === 'white' ? 'whiteWinsGame' : 'blackWinsGame'))) :
                snabbdom_1.h('em', root.trans.noarg('theGameIsADraw'))
        ])
    ]);
}
const minDepth = 8;
function renderEvalProgress(node, maxDepth) {
    return snabbdom_1.h('div.progress', snabbdom_1.h('div', {
        attrs: {
            style: `width: ${node.ceval ? (100 * Math.max(0, node.ceval.depth - minDepth) / (maxDepth - minDepth)) + '%' : 0}`
        }
    }));
}
function renderRunning(root, ctrl) {
    const hint = ctrl.hinting();
    return snabbdom_1.h('div.player.running', [
        snabbdom_1.h('div.no-square', snabbdom_1.h('piece.king.' + root.turnColor())),
        snabbdom_1.h('div.instruction', (ctrl.isMyTurn() ? [snabbdom_1.h('strong', root.trans.noarg('yourTurn'))] : [
            snabbdom_1.h('strong', root.trans.noarg('computerThinking')),
            renderEvalProgress(ctrl.currentNode(), ctrl.playableDepth())
        ]).concat(snabbdom_1.h('div.choices', [
            ctrl.isMyTurn() ? snabbdom_1.h('a', {
                hook: util_2.bind('click', () => root.practice.hint(), ctrl.redraw)
            }, root.trans.noarg(hint ? (hint.mode === 'piece' ? 'seeBestMove' : 'hideBestMove') : 'getAHint')) : ''
        ])))
    ]);
}
function default_1(root) {
    const ctrl = root.practice;
    if (!ctrl)
        return;
    const comment = ctrl.comment();
    const running = ctrl.running();
    const end = ctrl.currentNode().threefold ? 'threefoldRepetition' : root.gameOver();
    return snabbdom_1.h('div.practice-box.training-box.sub-box.' + (comment ? comment.verdict : 'no-verdict'), [
        snabbdom_1.h('div.title', root.trans.noarg('practiceWithComputer')),
        snabbdom_1.h('div.feedback', !running ? renderOffTrack(root, ctrl) : (end ? renderEnd(root, end) : renderRunning(root, ctrl))),
        running ? snabbdom_1.h('div.comment', comment ? [
            snabbdom_1.h('span.verdict', root.trans.noarg(comment.verdict)),
            ' '
        ].concat(commentBest(comment, root, ctrl)) : [ctrl.isMyTurn() || end ? '' : snabbdom_1.h('span.wait', root.trans.noarg('evaluatingYourMove'))]) : (running ? snabbdom_1.h('div.comment') : null)
    ]);
}
exports.default = default_1;
;

},{"../util":110,"chessground/util":18,"snabbdom":35}],69:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const ground = require("./ground");
const util_1 = require("./util");
const util = require("chessground/util");
let promoting;
function start(ctrl, orig, dest, capture, callback) {
    var s = ctrl.chessground.state;
    var piece = s.pieces[dest];
    if (piece && piece.role == 'pawn' && ((dest[1] == '8' && s.turnColor == 'black') ||
        (dest[1] == '1' && s.turnColor == 'white'))) {
        promoting = {
            orig,
            dest,
            capture,
            callback
        };
        ctrl.redraw();
        return true;
    }
    return false;
}
exports.start = start;
function finish(ctrl, role) {
    if (promoting) {
        ground.promote(ctrl.chessground, promoting.dest, role);
        if (promoting.callback)
            promoting.callback(promoting.orig, promoting.dest, promoting.capture, role);
    }
    promoting = undefined;
}
function cancel(ctrl) {
    if (promoting) {
        promoting = undefined;
        ctrl.chessground.set(ctrl.cgConfig);
        ctrl.redraw();
    }
}
exports.cancel = cancel;
function renderPromotion(ctrl, dest, pieces, color, orientation) {
    if (!promoting)
        return;
    let left = (8 - util.key2pos(dest)[0]) * 12.5;
    if (orientation === 'white')
        left = 87.5 - left;
    const vertical = color === orientation ? 'top' : 'bottom';
    return snabbdom_1.h('div#promotion-choice.' + vertical, {
        hook: util_1.onInsert(el => {
            el.addEventListener('click', _ => cancel(ctrl));
            el.oncontextmenu = () => false;
        })
    }, pieces.map(function (serverRole, i) {
        const top = (color === orientation ? i : 7 - i) * 12.5;
        return snabbdom_1.h('square', {
            attrs: {
                style: 'top:' + top + '%;left:' + left + '%'
            },
            hook: util_1.bind('click', e => {
                e.stopPropagation();
                finish(ctrl, serverRole);
            })
        }, [snabbdom_1.h('piece.' + serverRole + '.' + color)]);
    }));
}
function view(ctrl) {
    if (!promoting)
        return;
    var pieces = ['queen', 'knight', 'rook', 'bishop'];
    if (ctrl.data.game.variant.key === "antichess")
        pieces.push('king');
    return renderPromotion(ctrl, promoting.dest, pieces, util.opposite(ctrl.chessground.state.turnColor), ctrl.chessground.state.orientation);
}
exports.view = view;

},{"./ground":60,"./util":110,"chessground/util":18,"snabbdom":35}],70:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nodeFinder_1 = require("../nodeFinder");
const ceval_1 = require("ceval");
const tree_1 = require("tree");
const common_1 = require("common");
function make(root) {
    const game = root.data.game;
    const color = root.bottomColor();
    let candidateNodes = [];
    const explorerCancelPlies = [];
    let solvedPlies = [];
    const current = common_1.prop(null);
    const feedback = common_1.prop('find');
    const redraw = root.redraw;
    function isPlySolved(ply) {
        return solvedPlies.includes(ply);
    }
    ;
    function findNextNode() {
        const colorModulo = root.bottomIsWhite() ? 1 : 0;
        candidateNodes = nodeFinder_1.evalSwings(root.mainline, n => n.ply % 2 === colorModulo && !explorerCancelPlies.includes(n.ply));
        return candidateNodes.find(n => !isPlySolved(n.ply));
    }
    ;
    function jumpToNext() {
        feedback('find');
        const node = findNextNode();
        if (!node) {
            current(null);
            return redraw();
        }
        const fault = {
            node,
            path: root.mainlinePathToPly(node.ply)
        };
        const prevPath = tree_1.path.init(fault.path);
        const prev = {
            node: root.tree.nodeAtPath(prevPath),
            path: prevPath
        };
        const solutionNode = prev.node.children.find(n => !!n.comp);
        current({
            fault,
            prev,
            solution: {
                node: solutionNode,
                path: prevPath + solutionNode.id
            },
            openingUcis: []
        });
        // fetch opening explorer moves
        if (game.variant.key === 'standard' && game.division && (!game.division.middle || fault.node.ply < game.division.middle)) {
            root.explorer.fetchMasterOpening(prev.node.fen).then((res) => {
                const cur = current();
                const ucis = [];
                res.moves.forEach(m => {
                    if (m.white + m.draws + m.black > 1)
                        ucis.push(m.uci);
                });
                if (ucis.includes(fault.node.uci)) {
                    explorerCancelPlies.push(fault.node.ply);
                    setTimeout(jumpToNext, 100);
                }
                else {
                    cur.openingUcis = ucis;
                    current(cur);
                }
            });
        }
        root.userJump(prev.path);
        redraw();
    }
    ;
    function onJump() {
        const node = root.node, fb = feedback(), cur = current();
        if (!cur)
            return;
        if (fb === 'eval' && cur.fault.node.ply !== node.ply) {
            feedback('find');
            root.setAutoShapes();
            return;
        }
        if (isSolving() && cur.fault.node.ply === node.ply) {
            if (cur.openingUcis.includes(node.uci))
                onWin(); // found in opening explorer
            else if (node.comp)
                onWin(); // the computer solution line
            else if (node.eval)
                onFail(); // the move that was played in the game
            else {
                feedback('eval');
                if (!root.ceval.enabled())
                    root.toggleCeval();
                checkCeval();
            }
        }
        root.setAutoShapes();
    }
    ;
    function isCevalReady(node) {
        return node.ceval ? (node.ceval.depth >= 18 ||
            (node.ceval.depth >= 14 && node.ceval.millis > 7000)) : false;
    }
    ;
    function checkCeval() {
        var node = root.node, cur = current();
        if (!cur || feedback() !== 'eval' || cur.fault.node.ply !== node.ply)
            return;
        if (isCevalReady(node)) {
            var diff = ceval_1.winningChances.povDiff(color, node.ceval, cur.prev.node.eval);
            if (diff > -0.035)
                onWin();
            else
                onFail();
        }
    }
    function onWin() {
        solveCurrent();
        feedback('win');
        redraw();
    }
    function onFail() {
        feedback('fail');
        const bad = {
            node: root.node,
            path: root.path
        };
        root.userJump(current().prev.path);
        if (!root.tree.pathIsMainline(bad.path) && common_1.empty(bad.node.children))
            root.tree.deleteNodeAt(bad.path);
        redraw();
    }
    function viewSolution() {
        feedback('view');
        root.userJump(current().solution.path);
        solveCurrent();
    }
    function skip() {
        solveCurrent();
        jumpToNext();
    }
    function solveCurrent() {
        solvedPlies.push(current().fault.node.ply);
    }
    function hideComputerLine(node) {
        return (node.ply % 2 === 0) !== (color === 'white') && !isPlySolved(node.ply);
    }
    ;
    function showBadNode() {
        const cur = current();
        if (cur && isSolving() && cur.prev.path === root.path)
            return cur.fault.node;
    }
    function isSolving() {
        const fb = feedback();
        return fb === 'find' || fb === 'fail';
    }
    jumpToNext();
    function onMergeAnalysisData() {
        if (isSolving() && !current())
            jumpToNext();
    }
    return {
        current,
        color,
        isPlySolved,
        onJump,
        jumpToNext,
        skip,
        viewSolution,
        hideComputerLine,
        showBadNode,
        onCeval: checkCeval,
        onMergeAnalysisData,
        feedback,
        isSolving,
        completion: () => [solvedPlies.length, candidateNodes.length],
        reset() {
            solvedPlies = [];
            jumpToNext();
        },
        close: root.toggleRetro,
        trans: root.trans,
        noarg: root.trans.noarg,
        node: () => root.node,
        redraw
    };
}
exports.make = make;
;

},{"../nodeFinder":65,"ceval":113,"common":131,"tree":142}],71:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const moveView_1 = require("../moveView");
const util_1 = require("../util");
const snabbdom_1 = require("snabbdom");
function skipOrViewSolution(ctrl) {
    return snabbdom_1.h('div.choices', [
        snabbdom_1.h('a', {
            hook: util_1.bind('click', ctrl.viewSolution, ctrl.redraw)
        }, ctrl.noarg('viewTheSolution')),
        snabbdom_1.h('a', {
            hook: util_1.bind('click', ctrl.skip)
        }, ctrl.noarg('skipThisMove'))
    ]);
}
function jumpToNext(ctrl) {
    return snabbdom_1.h('a.half.continue', {
        hook: util_1.bind('click', ctrl.jumpToNext)
    }, [
        snabbdom_1.h('i', { attrs: util_1.dataIcon('G') }),
        ctrl.noarg('next')
    ]);
}
const minDepth = 8;
const maxDepth = 18;
function renderEvalProgress(node) {
    return snabbdom_1.h('div.progress', snabbdom_1.h('div', {
        attrs: {
            style: `width: ${node.ceval ? (100 * Math.max(0, node.ceval.depth - minDepth) / (maxDepth - minDepth)) + '%' : 0}`
        }
    }));
}
const feedback = {
    find(ctrl) {
        return [
            snabbdom_1.h('div.player', [
                snabbdom_1.h('div.no-square', snabbdom_1.h('piece.king.' + ctrl.color)),
                snabbdom_1.h('div.instruction', [
                    snabbdom_1.h('strong', ctrl.trans.vdom('xWasPlayed', snabbdom_1.h('move', moveView_1.renderIndexAndMove({
                        withDots: true,
                        showGlyphs: true,
                        showEval: false
                    }, ctrl.current().fault.node)))),
                    snabbdom_1.h('em', ctrl.noarg(ctrl.color === 'white' ? 'findBetterMoveForWhite' : 'findBetterMoveForBlack')),
                    skipOrViewSolution(ctrl)
                ])
            ])
        ];
    },
    // user has browsed away from the move to solve
    offTrack(ctrl) {
        return [
            snabbdom_1.h('div.player', [
                snabbdom_1.h('div.icon.off', '!'),
                snabbdom_1.h('div.instruction', [
                    snabbdom_1.h('strong', ctrl.noarg('youBrowsedAway')),
                    snabbdom_1.h('div.choices.off', [
                        snabbdom_1.h('a', {
                            hook: util_1.bind('click', ctrl.jumpToNext)
                        }, ctrl.noarg('resumeLearning'))
                    ])
                ])
            ])
        ];
    },
    fail(ctrl) {
        return [
            snabbdom_1.h('div.player', [
                snabbdom_1.h('div.icon', '✗'),
                snabbdom_1.h('div.instruction', [
                    snabbdom_1.h('strong', ctrl.noarg('youCanDoBetter')),
                    snabbdom_1.h('em', ctrl.noarg(ctrl.color === 'white' ? 'tryAnotherMoveForWhite' : 'tryAnotherMoveForBlack')),
                    skipOrViewSolution(ctrl)
                ])
            ])
        ];
    },
    win(ctrl) {
        return [
            snabbdom_1.h('div.half.top', snabbdom_1.h('div.player', [
                snabbdom_1.h('div.icon', '✓'),
                snabbdom_1.h('div.instruction', snabbdom_1.h('strong', ctrl.noarg('goodMove')))
            ])),
            jumpToNext(ctrl)
        ];
    },
    view(ctrl) {
        return [
            snabbdom_1.h('div.half.top', snabbdom_1.h('div.player', [
                snabbdom_1.h('div.icon', '✓'),
                snabbdom_1.h('div.instruction', [
                    snabbdom_1.h('strong', ctrl.noarg('solution')),
                    snabbdom_1.h('em', ctrl.trans.vdom('bestWasX', snabbdom_1.h('strong', moveView_1.renderIndexAndMove({
                        withDots: true,
                        showEval: false
                    }, ctrl.current().solution.node))))
                ])
            ])),
            jumpToNext(ctrl)
        ];
    },
    eval(ctrl) {
        return [
            snabbdom_1.h('div.half.top', snabbdom_1.h('div.player.center', [
                snabbdom_1.h('div.instruction', [
                    snabbdom_1.h('strong', ctrl.noarg('evaluatingYourMove')),
                    renderEvalProgress(ctrl.node())
                ])
            ]))
        ];
    },
    end(ctrl, flip, hasFullComputerAnalysis) {
        if (!hasFullComputerAnalysis())
            return [
                snabbdom_1.h('div.half.top', snabbdom_1.h('div.player', [
                    snabbdom_1.h('div.icon', util_1.spinner()),
                    snabbdom_1.h('div.instruction', ctrl.noarg('waitingForAnalysis'))
                ]))
            ];
        const nothing = !ctrl.completion()[1];
        return [
            snabbdom_1.h('div.player', [
                snabbdom_1.h('div.no-square', snabbdom_1.h('piece.king.' + ctrl.color)),
                snabbdom_1.h('div.instruction', [
                    snabbdom_1.h('em', nothing ?
                        ctrl.noarg(ctrl.color === 'white' ? 'noMistakesFoundForWhite' : 'noMistakesFoundForBlack') :
                        ctrl.noarg(ctrl.color === 'white' ? 'doneReviewingWhiteMistakes' : 'doneReviewingBlackMistakes')),
                    snabbdom_1.h('div.choices.end', [
                        nothing ? null : snabbdom_1.h('a', {
                            hook: util_1.bind('click', ctrl.reset)
                        }, ctrl.noarg('doItAgain')),
                        snabbdom_1.h('a', {
                            hook: util_1.bind('click', flip)
                        }, ctrl.noarg(ctrl.color === 'white' ? 'reviewBlackMistakes' : 'reviewWhiteMistakes'))
                    ])
                ])
            ])
        ];
    },
};
function renderFeedback(root, fb) {
    const ctrl = root.retro;
    const current = ctrl.current();
    if (ctrl.isSolving() && current && root.path !== current.prev.path)
        return feedback.offTrack(ctrl);
    if (fb === 'find')
        return current ? feedback.find(ctrl) :
            feedback.end(ctrl, root.flip, root.hasFullComputerAnalysis);
    return feedback[fb](ctrl);
}
function default_1(root) {
    const ctrl = root.retro;
    if (!ctrl)
        return;
    const fb = ctrl.feedback(), completion = ctrl.completion();
    return snabbdom_1.h('div.retro-box.training-box.sub-box', [
        snabbdom_1.h('div.title', [
            snabbdom_1.h('span', ctrl.noarg('learnFromYourMistakes')),
            snabbdom_1.h('span', Math.min(completion[0] + 1, completion[1]) + ' / ' + completion[1])
        ]),
        snabbdom_1.h('div.feedback.' + fb, renderFeedback(root, fb))
    ]);
}
exports.default = default_1;
;

},{"../moveView":64,"../util":110,"snabbdom":35}],72:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("common");
const util_1 = require("./util");
function default_1(element, ctrl) {
    const li = window.lichess;
    $(element).replaceWith(ctrl.opts.$underboard);
    $('#adv-chart').attr('id', 'acpl-chart');
    const data = ctrl.data, $panels = $('.analyse__underboard__panels > div'), $menu = $('.analyse__underboard__menu'), $timeChart = $("#movetimes-chart"), inputFen = document.querySelector('.analyse__underboard__fen'), unselect = chart => {
        chart.getSelectedPoints().forEach(function (point) {
            point.select(false);
        });
    };
    let lastFen;
    if (!li.AnalyseNVUI) {
        li.pubsub.on('analysis.comp.toggle', (v) => {
            setTimeout(function () {
                (v ? $menu.find('[data-panel="computer-analysis"]') : $menu.find('span:eq(1)')).trigger('mousedown');
            }, 50);
        });
        li.pubsub.on('analysis.change', (fen, _, mainlinePly) => {
            let chart, point, $chart = $("#acpl-chart");
            if (fen && fen !== lastFen) {
                inputFen.value = fen;
                lastFen = fen;
            }
            if ($chart.length) {
                chart = window.Highcharts && $chart.highcharts();
                if (chart) {
                    if (mainlinePly != chart.lastPly) {
                        if (mainlinePly === false)
                            unselect(chart);
                        else {
                            point = chart.series[0].data[mainlinePly - 1 - data.game.startedAtTurn];
                            if (common_1.defined(point))
                                point.select();
                            else
                                unselect(chart);
                        }
                    }
                    chart.lastPly = mainlinePly;
                }
            }
            if ($timeChart.length) {
                chart = window.Highcharts && $timeChart.highcharts();
                if (chart) {
                    if (mainlinePly != chart.lastPly) {
                        if (mainlinePly === false)
                            unselect(chart);
                        else {
                            const white = mainlinePly % 2 !== 0;
                            const serie = white ? 0 : 1;
                            const turn = Math.floor((mainlinePly - 1 - data.game.startedAtTurn) / 2);
                            point = chart.series[serie].data[turn];
                            if (common_1.defined(point))
                                point.select();
                            else
                                unselect(chart);
                        }
                    }
                    chart.lastPly = mainlinePly;
                }
            }
        });
        li.pubsub.on('analysis.server.progress', (d) => {
            if (!li.advantageChart)
                startAdvantageChart();
            else if (li.advantageChart.update)
                li.advantageChart.update(d);
            if (d.analysis && !d.analysis.partial)
                $("#acpl-chart-loader").remove();
        });
    }
    function chartLoader() {
        return '<div id="acpl-chart-loader">' +
            '<span>' + li.engineName + '<br>server analysis</span>' +
            li.spinnerHtml +
            '</div>';
    }
    ;
    function startAdvantageChart() {
        if (li.advantageChart || li.AnalyseNVUI)
            return;
        const loading = !data.treeParts[0].eval || !Object.keys(data.treeParts[0].eval).length;
        const $panel = $panels.filter('.computer-analysis');
        if (!$("#acpl-chart").length)
            $panel.html('<div id="acpl-chart"></div>' + (loading ? chartLoader() : ''));
        else if (loading && !$("#acpl-chart-loader").length)
            $panel.append(chartLoader());
        li.loadScript('javascripts/chart/acpl.js').then(function () {
            li.advantageChart(data, ctrl.trans, $("#acpl-chart")[0]);
        });
    }
    ;
    const storage = li.storage.make('analysis.panel');
    const setPanel = function (panel) {
        $menu.children('.active').removeClass('active').end().find(`[data-panel="${panel}"]`).addClass('active');
        $panels.removeClass('active').filter('.' + panel).addClass('active');
        if (panel == 'move-times' && !li.movetimeChart)
            try {
                li.loadScript('javascripts/chart/movetime.js').then(function () {
                    li.movetimeChart(data, ctrl.trans);
                });
            }
            catch (e) { }
        if (panel == 'computer-analysis' && $("#acpl-chart").length)
            setTimeout(startAdvantageChart, 200);
    };
    $menu.on('mousedown', 'span', function () {
        const panel = $(this).data('panel');
        storage.set(panel);
        setPanel(panel);
    });
    const stored = storage.get();
    if (stored && $menu.children(`[data-panel="${stored}"]:visible`).length)
        setPanel(stored);
    else {
        const $menuCt = $menu.children('[data-panel="ctable"]');
        ($menuCt.length ? $menuCt : $menu.children(':first-child')).trigger('mousedown');
    }
    if (!data.analysis) {
        $panels.find('form.future-game-analysis').submit(function () {
            if ($(this).hasClass('must-login')) {
                if (confirm(ctrl.trans('youNeedAnAccountToDoThat')))
                    location.href = '/signup';
                return false;
            }
            $.ajax(Object.assign(Object.assign({}, li.formAjax($(this))), { success: startAdvantageChart, error: li.reload }));
            return false;
        });
    }
    $panels.on('click', '.pgn', function () {
        const selection = window.getSelection(), range = document.createRange();
        range.selectNodeContents(this);
        selection.removeAllRanges();
        selection.addRange(range);
    });
    $panels.on('click', '.embed-howto', function () {
        const url = `${util_1.baseUrl()}/embed/${data.game.id}${location.hash}`;
        const iframe = '<iframe src="' + url + '?theme=auto&bg=auto"\nwidth=600 height=397 frameborder=0></iframe>';
        $.modal($('<strong style="font-size:1.5em">' + $(this).html() + '</strong><br /><br />' +
            '<pre>' + li.escapeHtml(iframe) + '</pre><br />' +
            iframe + '<br /><br />' +
            '<a class="text" data-icon="" href="/developers#embed-game">Read more about embedding games</a>'));
    });
}
exports.default = default_1;

},{"./util":110,"common":131}],73:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fen_1 = require("chessground/fen");
const tree_1 = require("tree");
function make(send, ctrl) {
    let anaMoveTimeout;
    let anaDestsTimeout;
    let anaDestsCache = {};
    function clearCache() {
        anaDestsCache = (ctrl.data.game.variant.key === 'standard' &&
            ctrl.tree.root.fen.split(' ', 1)[0] === fen_1.initial) ? {
            '': {
                path: '',
                dests: 'iqy muC gvx ltB bqs pxF jrz nvD ksA owE'
            }
        } : {};
    }
    clearCache();
    // forecast mode: reload when opponent moves
    if (!ctrl.synthetic)
        setTimeout(function () {
            send("startWatching", ctrl.data.game.id);
        }, 1000);
    function currentChapterId() {
        if (ctrl.study)
            return ctrl.study.vm.chapterId;
    }
    ;
    function addStudyData(req, isWrite = false) {
        var c = currentChapterId();
        if (c) {
            req.ch = c;
            if (isWrite) {
                if (ctrl.study.isWriting()) {
                    if (!ctrl.study.vm.mode.sticky)
                        req.sticky = false;
                }
                else
                    req.write = false;
            }
        }
    }
    ;
    const handlers = {
        node(data) {
            clearTimeout(anaMoveTimeout);
            // no strict equality here!
            if (data.ch == currentChapterId())
                ctrl.addNode(data.node, data.path);
            else
                console.log('socket handler node got wrong chapter id', data);
        },
        stepFailure() {
            clearTimeout(anaMoveTimeout);
            ctrl.reset();
        },
        dests(data) {
            clearTimeout(anaDestsTimeout);
            if (!data.ch || data.ch === currentChapterId()) {
                anaDestsCache[data.path] = data;
                ctrl.addDests(data.dests, data.path, data.opening);
            }
            else
                console.log('socket handler node got wrong chapter id', data);
        },
        destsFailure(data) {
            console.log(data);
            clearTimeout(anaDestsTimeout);
        },
        fen(e) {
            if (ctrl.forecast &&
                e.id === ctrl.data.game.id &&
                tree_1.ops.last(ctrl.mainline).fen.indexOf(e.fen) !== 0) {
                ctrl.forecast.reloadToLastPly();
            }
        },
        analysisProgress(data) {
            ctrl.mergeAnalysisData(data);
        },
        evalHit(e) {
            ctrl.evalCache.onCloudEval(e);
        },
        crowd(d) {
            ctrl.evalCache.upgradable(d.nb > 2);
        }
    };
    function withoutStandardVariant(obj) {
        if (obj.variant === 'standard')
            delete obj.variant;
    }
    function sendAnaDests(req) {
        clearTimeout(anaDestsTimeout);
        if (anaDestsCache[req.path])
            setTimeout(function () {
                handlers.dests(anaDestsCache[req.path]);
            }, 300);
        else {
            withoutStandardVariant(req);
            addStudyData(req);
            send('anaDests', req);
            anaDestsTimeout = setTimeout(function () {
                console.log(req, 'resendAnaDests');
                sendAnaDests(req);
            }, 3000);
        }
    }
    function sendAnaMove(req) {
        clearTimeout(anaMoveTimeout);
        withoutStandardVariant(req);
        addStudyData(req, true);
        send('anaMove', req);
        anaMoveTimeout = setTimeout(() => sendAnaMove(req), 3000);
    }
    function sendAnaDrop(req) {
        clearTimeout(anaMoveTimeout);
        withoutStandardVariant(req);
        addStudyData(req, true);
        send('anaDrop', req);
        anaMoveTimeout = setTimeout(() => sendAnaDrop(req), 3000);
    }
    return {
        receive(type, data) {
            const handler = handlers[type];
            if (handler)
                handler(data);
            return !!ctrl.study && ctrl.study.socketHandler(type, data);
        },
        sendAnaMove,
        sendAnaDrop,
        sendAnaDests,
        sendForecasts(req) { send('forecasts', req); },
        clearCache,
        send
    };
}
exports.make = make;

},{"chessground/fen":12,"tree":142}],74:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function setup() {
    window.lichess.pubsub.on('speech.enabled', onSpeechChange);
    onSpeechChange(window.lichess.sound.speech());
}
exports.setup = setup;
function onSpeechChange(enabled) {
    if (!window.LichessSpeech && enabled)
        window.lichess.loadScript(window.lichess.compiledScript('speech'));
    else if (window.LichessSpeech && !enabled)
        window.LichessSpeech = undefined;
}
function node(n) {
    withSpeech(s => s.step(n, true));
}
exports.node = node;
function withSpeech(f) {
    if (window.LichessSpeech)
        f(window.LichessSpeech);
}

},{}],75:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const common_1 = require("common");
const util_1 = require("../util");
const modal = require("../modal");
const chapterForm = require("./chapterNewForm");
function ctrl(send, chapterConfig, trans, redraw) {
    const current = common_1.prop(null);
    function open(data) {
        current({
            id: data.id,
            name: data.name
        });
        chapterConfig(data.id).then(d => {
            current(d);
            redraw();
        });
    }
    ;
    function isEditing(id) {
        const c = current();
        return c ? c.id === id : false;
    }
    ;
    return {
        open,
        toggle(data) {
            if (isEditing(data.id))
                current(null);
            else
                open(data);
        },
        current,
        submit(data) {
            const c = current();
            if (c) {
                data.id = c.id;
                send("editChapter", data);
                current(null);
            }
            redraw();
        },
        delete(id) {
            send("deleteChapter", id);
            current(null);
        },
        clearAnnotations(id) {
            send("clearAnnotations", id);
            current(null);
        },
        isEditing,
        trans,
        redraw
    };
}
exports.ctrl = ctrl;
function view(ctrl) {
    const data = ctrl.current();
    return data ? modal.modal({
        class: 'edit-' + data.id,
        onClose() {
            ctrl.current(null);
            ctrl.redraw();
        },
        content: [
            snabbdom_1.h('h2', ctrl.trans.noarg('editChapter')),
            snabbdom_1.h('form.form3', {
                hook: util_1.bindSubmit(e => {
                    const o = {};
                    'name mode orientation description'.split(' ').forEach(field => {
                        o[field] = chapterForm.fieldValue(e, field);
                    });
                    ctrl.submit(o);
                })
            }, [
                snabbdom_1.h('div.form-group', [
                    snabbdom_1.h('label.form-label', {
                        attrs: { for: 'chapter-name' }
                    }, ctrl.trans.noarg('name')),
                    snabbdom_1.h('input#chapter-name.form-control', {
                        attrs: {
                            minlength: 2,
                            maxlength: 80
                        },
                        hook: util_1.onInsert(el => {
                            if (!el.value) {
                                el.value = data.name;
                                el.select();
                                el.focus();
                            }
                        })
                    })
                ]),
                ...(isLoaded(data) ? viewLoaded(ctrl, data) : [util_1.spinner()])
            ]),
            snabbdom_1.h('div.destructive', [
                snabbdom_1.h(util_1.emptyRedButton, {
                    hook: util_1.bind('click', _ => {
                        if (confirm(ctrl.trans.noarg('clearAllCommentsInThisChapter')))
                            ctrl.clearAnnotations(data.id);
                    })
                }, ctrl.trans.noarg('clearAnnotations')),
                snabbdom_1.h(util_1.emptyRedButton, {
                    hook: util_1.bind('click', _ => {
                        if (confirm(ctrl.trans.noarg('deleteThisChapter')))
                            ctrl.delete(data.id);
                    })
                }, ctrl.trans.noarg('deleteChapter'))
            ])
        ]
    }) : undefined;
}
exports.view = view;
function isLoaded(data) {
    return !!data['orientation'];
}
function viewLoaded(ctrl, data) {
    const mode = data.practice ? 'practice' : (common_1.defined(data.conceal) ? 'conceal' : (data.gamebook ? 'gamebook' : 'normal'));
    return [
        snabbdom_1.h('div.form-split', [
            snabbdom_1.h('div.form-group.form-half', [
                snabbdom_1.h('label.form-label', {
                    attrs: { for: 'chapter-orientation' }
                }, ctrl.trans.noarg('orientation')),
                snabbdom_1.h('select#chapter-orientation.form-control', ['white', 'black'].map(function (color) {
                    return util_1.option(color, data.orientation, ctrl.trans.noarg(color));
                }))
            ]),
            snabbdom_1.h('div.form-group.form-half', [
                snabbdom_1.h('label.form-label', {
                    attrs: { for: 'chapter-mode' }
                }, ctrl.trans.noarg('analysisMode')),
                snabbdom_1.h('select#chapter-mode.form-control', chapterForm.modeChoices.map(c => {
                    return util_1.option(c[0], mode, ctrl.trans.noarg(c[1]));
                }))
            ])
        ]),
        snabbdom_1.h('div.form-group', [
            snabbdom_1.h('label.form-label', {
                attrs: { for: 'chapter-description' }
            }, ctrl.trans.noarg('pinnedChapterComment')),
            snabbdom_1.h('select#chapter-description.form-control', [
                ['', ctrl.trans.noarg('noPinnedComment')],
                ['1', ctrl.trans.noarg('rightUnderTheBoard')]
            ].map(v => util_1.option(v[0], data.description ? '1' : '', v[1])))
        ]),
        modal.button(ctrl.trans.noarg('saveChapter'))
    ];
}

},{"../modal":63,"../util":110,"./chapterNewForm":76,"common":131,"snabbdom":35}],76:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const common_1 = require("common");
const storage_1 = require("common/storage");
const util_1 = require("../util");
const studyXhr_1 = require("./studyXhr");
const modal = require("../modal");
const studyTour_1 = require("./studyTour");
exports.modeChoices = [
    ['normal', 'normalAnalysis'],
    ['practice', 'practiceWithComputer'],
    ['conceal', 'hideNextMoves'],
    ['gamebook', 'interactiveLesson']
];
function fieldValue(e, id) {
    const el = e.target.querySelector('#chapter-' + id);
    return el ? el.value : null;
}
exports.fieldValue = fieldValue;
;
function ctrl(send, chapters, setTab, root) {
    const multiPgnMax = 20;
    const vm = {
        variants: [],
        open: false,
        initial: common_1.prop(false),
        tab: storage_1.storedProp('study.form.tab', 'init'),
        editor: null,
        editorFen: common_1.prop(null)
    };
    function loadVariants() {
        if (!vm.variants.length)
            studyXhr_1.variants().then(function (vs) {
                vm.variants = vs;
                root.redraw();
            });
    }
    ;
    function open() {
        vm.open = true;
        loadVariants();
        vm.initial(false);
    }
    function close() {
        vm.open = false;
    }
    return {
        vm,
        open,
        root,
        openInitial() {
            open();
            vm.initial(true);
        },
        close,
        toggle() {
            if (vm.open)
                close();
            else
                open();
        },
        submit(d) {
            const study = root.study;
            d.initial = vm.initial();
            d.sticky = study.vm.mode.sticky;
            if (!d.pgn)
                send("addChapter", d);
            else
                studyXhr_1.importPgn(study.data.id, d);
            close();
            setTab();
        },
        chapters,
        startTour: () => studyTour_1.chapter(tab => {
            vm.tab(tab);
            root.redraw();
        }),
        multiPgnMax,
        redraw: root.redraw
    };
}
exports.ctrl = ctrl;
function view(ctrl) {
    const trans = ctrl.root.trans;
    const activeTab = ctrl.vm.tab();
    const makeTab = function (key, name, title) {
        return snabbdom_1.h('span.' + key, {
            class: { active: activeTab === key },
            attrs: { title },
            hook: util_1.bind('click', () => ctrl.vm.tab(key), ctrl.root.redraw)
        }, name);
    };
    const gameOrPgn = activeTab === 'game' || activeTab === 'pgn';
    const currentChapter = ctrl.root.study.data.chapter;
    const mode = currentChapter.practice ? 'practice' : (common_1.defined(currentChapter.conceal) ? 'conceal' : (currentChapter.gamebook ? 'gamebook' : 'normal'));
    return modal.modal({
        class: 'chapter-new',
        onClose() {
            ctrl.close();
            ctrl.redraw();
        },
        content: [
            activeTab === 'edit' ? null : snabbdom_1.h('h2', [
                trans.noarg('newChapter'),
                snabbdom_1.h('i.help', {
                    attrs: { 'data-icon': '' },
                    hook: util_1.bind('click', ctrl.startTour)
                })
            ]),
            snabbdom_1.h('form.form3', {
                hook: util_1.bindSubmit(e => {
                    const o = {
                        fen: fieldValue(e, 'fen') || (ctrl.vm.tab() === 'edit' ? ctrl.vm.editorFen() : null)
                    };
                    'name game variant pgn orientation mode'.split(' ').forEach(field => {
                        o[field] = fieldValue(e, field);
                    });
                    ctrl.submit(o);
                }, ctrl.redraw)
            }, [
                snabbdom_1.h('div.form-group', [
                    snabbdom_1.h('label.form-label', {
                        attrs: { for: 'chapter-name' }
                    }, trans.noarg('name')),
                    snabbdom_1.h('input#chapter-name.form-control', {
                        attrs: {
                            minlength: 2,
                            maxlength: 80
                        },
                        hook: util_1.onInsert(el => {
                            if (!el.value) {
                                el.value = trans('chapterX', (ctrl.vm.initial() ? 1 : (ctrl.chapters().length + 1)));
                                el.select();
                                el.focus();
                            }
                        })
                    })
                ]),
                snabbdom_1.h('div.tabs-horiz', [
                    makeTab('init', trans.noarg('empty'), trans.noarg('startFromInitialPosition')),
                    makeTab('edit', trans.noarg('editor'), trans.noarg('startFromCustomPosition')),
                    makeTab('game', 'URL', trans.noarg('loadAGameByUrl')),
                    makeTab('fen', 'FEN', trans.noarg('loadAPositionFromFen')),
                    makeTab('pgn', 'PGN', trans.noarg('loadAGameFromPgn'))
                ]),
                activeTab === 'edit' ? snabbdom_1.h('div.board-editor-wrap', {
                    hook: {
                        insert: vnode => {
                            $.when(window.lichess.loadScript('compiled/lichess.editor.min.js'), $.get('/editor.json', {
                                fen: ctrl.root.node.fen
                            })).then(function (_, b) {
                                const data = b[0];
                                data.embed = true;
                                data.options = {
                                    inlineCastling: true,
                                    onChange: ctrl.vm.editorFen
                                };
                                ctrl.vm.editor = window['LichessEditor'](vnode.elm, data);
                                ctrl.vm.editorFen(ctrl.vm.editor.getFen());
                            });
                        },
                        destroy: _ => {
                            ctrl.vm.editor = null;
                        }
                    }
                }, [util_1.spinner()]) : null,
                activeTab === 'game' ? snabbdom_1.h('div.form-group', [
                    snabbdom_1.h('label.form-label', {
                        attrs: { 'for': 'chapter-game' }
                    }, trans('loadAGameFromXOrY', 'lichess.org', 'chessgames.com')),
                    snabbdom_1.h('input#chapter-game.form-control', {
                        attrs: { placeholder: trans.noarg('urlOfTheGame') }
                    })
                ]) : null,
                activeTab === 'fen' ? snabbdom_1.h('div.form-group', [
                    snabbdom_1.h('input#chapter-fen.form-control', {
                        attrs: {
                            value: ctrl.root.node.fen,
                            placeholder: trans.noarg('loadAPositionFromFen')
                        }
                    })
                ]) : null,
                activeTab === 'pgn' ? snabbdom_1.h('div.form-groupabel', [
                    snabbdom_1.h('textarea#chapter-pgn.form-control', {
                        attrs: { placeholder: trans.plural('pasteYourPgnTextHereUpToNbGames', ctrl.multiPgnMax) }
                    }),
                    window.FileReader ? snabbdom_1.h('input#chapter-pgn-file.form-control', {
                        attrs: {
                            type: 'file',
                            accept: '.pgn'
                        },
                        hook: util_1.bind('change', e => {
                            const file = e.target.files[0];
                            if (!file)
                                return;
                            const reader = new FileReader();
                            reader.onload = function () {
                                document.getElementById('chapter-pgn').value = reader.result;
                            };
                            reader.readAsText(file);
                        })
                    }) : null
                ]) : null,
                snabbdom_1.h('div.form-split', [
                    snabbdom_1.h('div.form-group.form-half', [
                        snabbdom_1.h('label.form-label', {
                            attrs: { 'for': 'chapter-variant' }
                        }, trans.noarg('Variant')),
                        snabbdom_1.h('select#chapter-variant.form-control', {
                            attrs: { disabled: gameOrPgn }
                        }, gameOrPgn ? [
                            snabbdom_1.h('option', trans.noarg('automatic'))
                        ] :
                            ctrl.vm.variants.map(v => util_1.option(v.key, currentChapter.setup.variant.key, v.name)))
                    ]),
                    snabbdom_1.h('div.form-group.form-half', [
                        snabbdom_1.h('label.form-label', {
                            attrs: { 'for': 'chapter-orientation' }
                        }, trans.noarg('orientation')),
                        snabbdom_1.h('select#chapter-orientation.form-control', {
                            hook: util_1.bind('change', e => {
                                ctrl.vm.editor && ctrl.vm.editor.setOrientation(e.target.value);
                            })
                        }, ['white', 'black'].map(function (color) {
                            return util_1.option(color, currentChapter.setup.orientation, trans.noarg(color));
                        }))
                    ])
                ]),
                snabbdom_1.h('div.form-group', [
                    snabbdom_1.h('label.form-label', {
                        attrs: { 'for': 'chapter-mode' }
                    }, trans.noarg('analysisMode')),
                    snabbdom_1.h('select#chapter-mode.form-control', exports.modeChoices.map(c => util_1.option(c[0], mode, trans.noarg(c[1]))))
                ]),
                modal.button(trans.noarg('createChapter'))
            ])
        ]
    });
}
exports.view = view;

},{"../modal":63,"../util":110,"./studyTour":103,"./studyXhr":105,"common":131,"common/storage":135,"snabbdom":35}],77:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const studyComments_1 = require("./studyComments");
const util_1 = require("../util");
const common_1 = require("common");
const throttle_1 = require("common/throttle");
function ctrl(root) {
    const current = common_1.prop(null), focus = common_1.prop(false), opening = common_1.prop(false);
    function submit(text) {
        if (!current())
            return;
        doSubmit(text);
    }
    ;
    const doSubmit = throttle_1.default(500, (text) => {
        const cur = current();
        if (cur)
            root.study.makeChange('setComment', {
                ch: cur.chapterId,
                path: cur.path,
                text
            });
    });
    function start(chapterId, path, node) {
        opening(true);
        current({
            chapterId,
            path,
            node
        });
        root.userJump(path);
    }
    ;
    return {
        root,
        current,
        focus,
        opening,
        submit,
        start,
        onSetPath(chapterId, path, node, playedMyself) {
            setTimeout(() => {
                const cur = current();
                if (cur && (path !== cur.path || chapterId !== cur.chapterId) && (!focus() || playedMyself)) {
                    cur.chapterId = chapterId;
                    cur.path = path;
                    cur.node = node;
                    root.redraw();
                }
            }, 100);
        },
        redraw: root.redraw,
        delete(chapterId, path, id) {
            root.study.makeChange('deleteComment', {
                ch: chapterId,
                path,
                id
            });
        }
    };
}
exports.ctrl = ctrl;
function viewDisabled(root, why) {
    return snabbdom_1.h('div.study__comments', [
        studyComments_1.currentComments(root, true),
        snabbdom_1.h('div.study__message', why)
    ]);
}
exports.viewDisabled = viewDisabled;
function view(root) {
    const study = root.study, ctrl = study.commentForm, current = ctrl.current();
    if (!current)
        return viewDisabled(root, 'Select a move to comment');
    function setupTextarea(vnode) {
        const el = vnode.elm, mine = (current.node.comments || []).find(function (c) {
            return c.by && c.by.id && c.by.id === ctrl.root.opts.userId;
        });
        el.value = mine ? mine.text : '';
        if (ctrl.opening() || ctrl.focus())
            window.lichess.raf(() => el.focus());
        ctrl.opening(false);
    }
    return snabbdom_1.h('div.study__comments', [
        studyComments_1.currentComments(root, !study.members.canContribute()),
        snabbdom_1.h('form.form3', [
            ctrl.focus() && ctrl.root.path !== current.path ? snabbdom_1.h('p', [
                'Commenting position after ',
                snabbdom_1.h('a', {
                    hook: util_1.bind('mousedown', () => ctrl.root.userJump(current.path), ctrl.redraw)
                }, util_1.nodeFullName(current.node))
            ]) : null,
            snabbdom_1.h('div.form-group', [
                snabbdom_1.h('textarea#comment-text.form-control', {
                    hook: {
                        insert(vnode) {
                            setupTextarea(vnode);
                            const el = vnode.elm;
                            function onChange() {
                                setTimeout(function () {
                                    ctrl.submit(el.value);
                                }, 50);
                            }
                            el.onkeyup = el.onpaste = onChange;
                            el.onfocus = function () {
                                ctrl.focus(true);
                                ctrl.redraw();
                            };
                            el.onblur = function () {
                                ctrl.focus(false);
                            };
                            vnode.data.hash = current.chapterId + current.path;
                        },
                        postpatch(old, vnode) {
                            const newKey = current.chapterId + current.path;
                            if (old.data.path !== newKey)
                                setupTextarea(vnode);
                            vnode.data.path = newKey;
                        }
                    }
                })
            ])
        ])
    ]);
}
exports.view = view;

},{"../util":110,"./studyComments":96,"common":131,"common/throttle":137,"snabbdom":35}],78:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const util_1 = require("../util");
class DescriptionCtrl {
    constructor(text, doSave, redraw) {
        this.text = text;
        this.doSave = doSave;
        this.redraw = redraw;
        this.edit = false;
    }
    save(t) {
        this.text = t;
        this.doSave(t);
        this.redraw();
    }
    set(t) {
        this.text = t ? t : undefined;
    }
}
exports.DescriptionCtrl = DescriptionCtrl;
function descTitle(chapter) {
    return `${chapter ? 'Chapter' : 'Study'} pinned comment`;
}
exports.descTitle = descTitle;
function view(study, chapter) {
    const desc = chapter ? study.chapterDesc : study.studyDesc, contrib = study.members.canContribute() && !study.gamebookPlay();
    if (desc.edit)
        return edit(desc, chapter ? study.data.chapter.id : study.data.id, chapter);
    const isEmpty = desc.text === '-';
    if (!desc.text || (isEmpty && !contrib))
        return;
    return snabbdom_1.h(`div.study-desc${chapter ? '.chapter-desc' : ''}${isEmpty ? '.empty' : ''}`, [
        contrib && !isEmpty ? snabbdom_1.h('div.contrib', [
            snabbdom_1.h('span', descTitle(chapter)),
            isEmpty ? null : snabbdom_1.h('a', {
                attrs: {
                    'data-icon': 'm',
                    title: 'Edit'
                },
                hook: util_1.bind('click', _ => { desc.edit = true; }, desc.redraw)
            }),
            snabbdom_1.h('a', {
                attrs: {
                    'data-icon': 'q',
                    title: 'Delete'
                },
                hook: util_1.bind('click', () => {
                    if (confirm('Delete permanent description?'))
                        desc.save('');
                })
            })
        ]) : null,
        isEmpty ? snabbdom_1.h('a.text.button', {
            hook: util_1.bind('click', _ => { desc.edit = true; }, desc.redraw)
        }, descTitle(chapter)) : snabbdom_1.h('div.text', { hook: util_1.richHTML(desc.text) })
    ]);
}
exports.view = view;
function edit(ctrl, id, chapter) {
    return snabbdom_1.h('div.study-desc-form', [
        snabbdom_1.h('div.title', [
            descTitle(chapter),
            snabbdom_1.h('button.button.button-empty.button-red', {
                attrs: {
                    'data-icon': 'L',
                    title: 'Close'
                },
                hook: util_1.bind('click', () => ctrl.edit = false, ctrl.redraw)
            })
        ]),
        snabbdom_1.h('form.form3', [
            snabbdom_1.h('div.form-group', [
                snabbdom_1.h('textarea#form-control.desc-text.' + id, {
                    hook: util_1.onInsert(el => {
                        el.value = ctrl.text === '-' ? '' : (ctrl.text || '');
                        el.onkeyup = el.onpaste = () => {
                            ctrl.save(el.value.trim());
                        };
                        el.focus();
                    })
                })
            ])
        ])
    ]);
}

},{"../util":110,"snabbdom":35}],79:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const util_1 = require("../../util");
function playButtons(root) {
    const study = root.study, ctrl = study.gamebookPlay();
    if (!ctrl)
        return;
    const state = ctrl.state, fb = state.feedback, myTurn = fb === 'play';
    return snabbdom_1.h('div.gamebook-buttons', [
        root.path ? snabbdom_1.h('a.fbt.text.back', {
            attrs: util_1.dataIcon('I'),
            hook: util_1.bind('click', () => root.userJump(''), ctrl.redraw)
        }, 'Back') : null,
        myTurn ? snabbdom_1.h('a.fbt.text.solution', {
            attrs: util_1.dataIcon('G'),
            hook: util_1.bind('click', ctrl.solution, ctrl.redraw)
        }, 'View the solution') : undefined,
        overrideButton(study)
    ]);
}
exports.playButtons = playButtons;
function overrideButton(study) {
    if (study.data.chapter.gamebook) {
        const o = study.vm.gamebookOverride;
        if (study.members.canContribute())
            return snabbdom_1.h('a.fbt.text.preview', {
                class: { active: o === 'play' },
                attrs: util_1.dataIcon('v'),
                hook: util_1.bind('click', () => {
                    study.setGamebookOverride(o === 'play' ? undefined : 'play');
                }, study.redraw)
            }, 'Preview');
        else {
            const isAnalyse = o === 'analyse', ctrl = study.gamebookPlay();
            if (isAnalyse || (ctrl && ctrl.state.feedback === 'end'))
                return snabbdom_1.h('a.fbt.text.preview', {
                    class: { active: isAnalyse },
                    attrs: util_1.dataIcon('A'),
                    hook: util_1.bind('click', () => {
                        study.setGamebookOverride(isAnalyse ? undefined : 'analyse');
                    }, study.redraw)
                }, 'Analyse');
        }
    }
}
exports.overrideButton = overrideButton;

},{"../../util":110,"snabbdom":35}],80:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const util_1 = require("../../util");
const throttle_1 = require("common/throttle");
const control = require("../../control");
function running(ctrl) {
    return !!ctrl.study && ctrl.study.data.chapter.gamebook &&
        !ctrl.gamebookPlay() && ctrl.study.vm.gamebookOverride !== 'analyse';
}
exports.running = running;
function render(ctrl) {
    const study = ctrl.study, isMyMove = ctrl.turnColor() === ctrl.data.orientation, isCommented = !!(ctrl.node.comments || []).find(c => c.text.length > 2), hasVariation = ctrl.tree.parentNode(ctrl.path).children.length > 1;
    let content;
    const commentHook = util_1.bind('click', () => {
        study.commentForm.start(study.vm.chapterId, ctrl.path, ctrl.node);
        study.vm.toolTab('comments');
        window.lichess.requestIdleCallback(() => $('#comment-text').focus());
    }, ctrl.redraw);
    if (!ctrl.path) {
        if (isMyMove)
            content = [
                snabbdom_1.h('div.legend.todo.clickable', {
                    hook: commentHook,
                    class: { done: isCommented }
                }, [
                    util_1.iconTag('c'),
                    snabbdom_1.h('p', 'Help the player find the initial move, with a comment.')
                ]),
                renderHint(ctrl)
            ];
        else
            content = [
                snabbdom_1.h('div.legend.clickable', {
                    hook: commentHook
                }, [
                    util_1.iconTag('c'),
                    snabbdom_1.h('p', 'Introduce the gamebook with a comment')
                ]),
                snabbdom_1.h('div.legend.todo', { class: { done: !!ctrl.node.children[0] } }, [
                    util_1.iconTag('G'),
                    snabbdom_1.h('p', 'Put the opponent\'s first move on the board.')
                ])
            ];
    }
    else if (ctrl.onMainline) {
        if (isMyMove)
            content = [
                snabbdom_1.h('div.legend.todo.clickable', {
                    hook: commentHook,
                    class: { done: isCommented }
                }, [
                    util_1.iconTag('c'),
                    snabbdom_1.h('p', 'Explain the opponent move, and help the player find the next move, with a comment.')
                ]),
                renderHint(ctrl)
            ];
        else
            content = [
                snabbdom_1.h('div.legend.clickable', {
                    hook: commentHook,
                }, [
                    util_1.iconTag('c'),
                    snabbdom_1.h('p', 'You may reflect on the player\'s correct move, with a comment; or leave empty to jump immediately to the next move.')
                ]),
                hasVariation ? null : snabbdom_1.h('div.legend.clickable', {
                    hook: util_1.bind('click', () => control.prev(ctrl), ctrl.redraw)
                }, [
                    util_1.iconTag('G'),
                    snabbdom_1.h('p', 'Add variation moves to explain why specific other moves are wrong.')
                ]),
                renderDeviation(ctrl)
            ];
    }
    else
        content = [
            snabbdom_1.h('div.legend.todo.clickable', {
                hook: commentHook,
                class: { done: isCommented }
            }, [
                util_1.iconTag('c'),
                snabbdom_1.h('p', 'Explain why this move is wrong in a comment')
            ]),
            snabbdom_1.h('div.legend', [
                snabbdom_1.h('p', 'Or promote it as the mainline if it is the right move.')
            ])
        ];
    return snabbdom_1.h('div.gamebook-edit', {
        hook: { insert: _ => window.lichess.loadCssPath('analyse.gamebook.edit') }
    }, content);
}
exports.render = render;
function renderDeviation(ctrl) {
    const field = 'deviation';
    return snabbdom_1.h('div.deviation', [
        snabbdom_1.h('div.legend.todo', { class: { done: nodeGamebookValue(ctrl.node, field).length > 2 } }, [
            util_1.iconTag('c'),
            snabbdom_1.h('p', 'When any other wrong move is played:')
        ]),
        snabbdom_1.h('textarea', {
            attrs: { placeholder: 'Explain why all other moves are wrong' },
            hook: textareaHook(ctrl, field)
        })
    ]);
}
function renderHint(ctrl) {
    const field = 'hint';
    return snabbdom_1.h('div.hint', [
        snabbdom_1.h('div.legend', [
            util_1.iconTag(''),
            snabbdom_1.h('p', 'Optional, on-demand hint for the player:')
        ]),
        snabbdom_1.h('textarea', {
            attrs: { placeholder: 'Give the player a tip so they can find the right move' },
            hook: textareaHook(ctrl, field)
        })
    ]);
}
const saveNode = throttle_1.default(500, (ctrl, gamebook) => {
    ctrl.socket.send('setGamebook', {
        path: ctrl.path,
        ch: ctrl.study.vm.chapterId,
        gamebook: gamebook
    });
    ctrl.redraw();
});
function nodeGamebookValue(node, field) {
    return (node.gamebook && node.gamebook[field]) || '';
}
function textareaHook(ctrl, field) {
    const value = nodeGamebookValue(ctrl.node, field);
    return {
        insert(vnode) {
            const el = vnode.elm;
            el.value = value;
            el.onkeyup = el.onpaste = () => {
                const node = ctrl.node;
                node.gamebook = node.gamebook || {};
                node.gamebook[field] = el.value.trim();
                saveNode(ctrl, node.gamebook, 50);
            };
            vnode.data.path = ctrl.path;
        },
        postpatch(old, vnode) {
            if (old.data.path !== ctrl.path)
                vnode.elm.value = value;
            vnode.data.path = ctrl.path;
        }
    };
}

},{"../../control":45,"../../util":110,"common/throttle":137,"snabbdom":35}],81:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tree_1 = require("tree");
const autoShape_1 = require("../../autoShape");
class GamebookPlayCtrl {
    constructor(root, chapterId, trans, redraw) {
        this.root = root;
        this.chapterId = chapterId;
        this.trans = trans;
        this.redraw = redraw;
        this.makeState = () => {
            const node = this.root.node, nodeComment = (node.comments || [])[0], state = {
                init: this.root.path === '',
                comment: nodeComment ? nodeComment.text : undefined,
                showHint: false,
            }, parPath = tree_1.path.init(this.root.path), parNode = this.root.tree.nodeAtPath(parPath);
            if (!this.root.onMainline && !this.root.tree.pathIsMainline(parPath))
                return;
            if (this.root.onMainline && !node.children[0]) {
                state.feedback = 'end';
            }
            else if (this.isMyMove()) {
                state.feedback = 'play';
                state.hint = (node.gamebook || {}).hint;
            }
            else if (this.root.onMainline) {
                state.feedback = 'good';
            }
            else {
                state.feedback = 'bad';
                if (!state.comment) {
                    state.comment = parNode.children[0].gamebook.deviation;
                }
            }
            this.state = state;
            if (!state.comment) {
                if (state.feedback === 'good')
                    setTimeout(this.next, this.root.path ? 1000 : 300);
                else if (state.feedback === 'bad')
                    setTimeout(this.retry, 800);
            }
        };
        this.isMyMove = () => this.root.turnColor() === this.root.data.orientation;
        this.retry = () => {
            let path = this.root.path;
            while (path && !this.root.tree.pathIsMainline(path))
                path = tree_1.path.init(path);
            this.root.userJump(path);
            this.redraw();
        };
        this.next = () => {
            if (!this.isMyMove()) {
                const child = this.root.node.children[0];
                if (child)
                    this.root.userJump(this.root.path + child.id);
            }
            this.redraw();
        };
        this.onSpace = () => {
            switch (this.state.feedback) {
                case 'bad':
                    this.retry();
                    break;
                case 'end':
                    const s = this.root.study, c = s.nextChapter();
                    if (c)
                        s.setChapter(c.id);
                    break;
                default:
                    this.next();
            }
        };
        this.onPremoveSet = () => {
            this.next();
        };
        this.hint = () => {
            if (this.state.hint)
                this.state.showHint = !this.state.showHint;
        };
        this.solution = () => {
            this.root.chessground.setShapes(autoShape_1.makeShapesFromUci(this.root.turnColor(), this.root.node.children[0].uci, 'green'));
        };
        this.canJumpTo = (path) => tree_1.path.contains(this.root.path, path);
        this.onJump = () => {
            this.makeState();
            // wait for the root ctrl to make the move
            setTimeout(() => this.root.withCg(cg => cg.playPremove()), 100);
        };
        this.onShapeChange = shapes => {
            const node = this.root.node;
            if (node.gamebook && node.gamebook.shapes && !shapes.length) {
                node.shapes = node.gamebook.shapes.slice(0);
                this.root.jump(this.root.path);
            }
        };
        // ensure all original nodes have a gamebook entry,
        // so we can differentiate original nodes from user-made ones
        tree_1.ops.updateAll(root.tree.root, n => {
            n.gamebook = n.gamebook || {};
            if (n.shapes)
                n.gamebook.shapes = n.shapes.slice(0);
        });
        this.makeState();
    }
}
exports.default = GamebookPlayCtrl;

},{"../../autoShape":40,"tree":142}],82:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const util_1 = require("../../util");
const defaultComments = {
    play: 'What would you play in this position?',
    end: 'Congratulations! You completed this lesson.'
};
function render(ctrl) {
    const state = ctrl.state, comment = state.comment || defaultComments[state.feedback];
    return snabbdom_1.h('div.gamebook', {
        hook: { insert: _ => window.lichess.loadCssPath('analyse.gamebook.play') }
    }, [
        comment ? snabbdom_1.h('div.comment', {
            class: { hinted: state.showHint }
        }, [
            snabbdom_1.h('div.content', { hook: util_1.richHTML(comment) }),
            hintZone(ctrl)
        ]) : undefined,
        snabbdom_1.h('div.floor', [
            renderFeedback(ctrl, state),
            snabbdom_1.h('img.mascot', {
                attrs: {
                    width: 120,
                    height: 120,
                    src: window.lichess.assetUrl('images/mascot/octopus.svg')
                }
            })
        ])
    ]);
}
exports.render = render;
function hintZone(ctrl) {
    const state = ctrl.state, clickHook = () => ({
        hook: util_1.bind('click', ctrl.hint, ctrl.redraw)
    });
    if (state.showHint)
        return snabbdom_1.h('div', clickHook(), [
            snabbdom_1.h('div.hint', { hook: util_1.richHTML(state.hint) })
        ]);
    if (state.hint)
        return snabbdom_1.h('a.hint', clickHook(), 'Get a hint');
}
function renderFeedback(ctrl, state) {
    const fb = state.feedback, color = ctrl.root.turnColor();
    if (fb === 'bad')
        return snabbdom_1.h('div.feedback.act.bad' + (state.comment ? '.com' : ''), {
            hook: util_1.bind('click', ctrl.retry)
        }, [
            util_1.iconTag('P'),
            snabbdom_1.h('span', 'Retry')
        ]);
    if (fb === 'good' && state.comment)
        return snabbdom_1.h('div.feedback.act.good.com', {
            hook: util_1.bind('click', ctrl.next)
        }, [
            snabbdom_1.h('span.text', { attrs: util_1.dataIcon('G') }, 'Next'),
            snabbdom_1.h('kbd', '<space>')
        ]);
    if (fb === 'end')
        return renderEnd(ctrl);
    return snabbdom_1.h('div.feedback.info.' + fb + (state.init ? '.init' : ''), snabbdom_1.h('div', fb === 'play' ? [
        snabbdom_1.h('div.no-square', snabbdom_1.h('piece.king.' + color)),
        snabbdom_1.h('div.instruction', [
            snabbdom_1.h('strong', ctrl.trans.noarg('yourTurn')),
            snabbdom_1.h('em', ctrl.trans.noarg(color === 'white' ? 'findTheBestMoveForWhite' : 'findTheBestMoveForBlack'))
        ])
    ] : ['Good move!']));
}
function renderEnd(ctrl) {
    const study = ctrl.root.study, nextChapter = study.nextChapter();
    return snabbdom_1.h('div.feedback.end', [
        nextChapter ? snabbdom_1.h('a.next.text', {
            attrs: util_1.dataIcon('G'),
            hook: util_1.bind('click', () => study.setChapter(nextChapter.id))
        }, 'Next chapter') : undefined,
        snabbdom_1.h('a.retry', {
            attrs: util_1.dataIcon('P'),
            hook: util_1.bind('click', () => ctrl.root.userJump(''), ctrl.redraw)
        }, 'Play again'),
        snabbdom_1.h('a.analyse', {
            attrs: util_1.dataIcon('A'),
            hook: util_1.bind('click', () => study.setGamebookOverride('analyse'), ctrl.redraw)
        }, 'Analyse')
    ]);
}

},{"../../util":110,"snabbdom":35}],83:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const util_1 = require("../util");
const common_1 = require("common");
const modal_1 = require("../modal");
function ctrl(send, members, setTab, redraw, trans) {
    const open = common_1.prop(false);
    let followings = [];
    let spectators = [];
    function updateFollowings(f) {
        followings = f(followings);
        if (open())
            redraw();
    }
    ;
    return {
        open,
        candidates() {
            const existing = members();
            return followings.concat(spectators).filter(function (elem, idx, arr) {
                return arr.indexOf(elem) >= idx && // remove duplicates
                    !existing.hasOwnProperty(util_1.titleNameToId(elem)); // remove existing members
            }).sort();
        },
        members,
        setSpectators(usernames) {
            spectators = usernames;
        },
        setFollowings(usernames) {
            updateFollowings(_ => usernames);
        },
        delFollowing(username) {
            updateFollowings(function (prevs) {
                return prevs.filter(function (u) {
                    return username !== u;
                });
            });
        },
        addFollowing(username) {
            updateFollowings(function (prevs) {
                return prevs.concat([username]);
            });
        },
        toggle() {
            open(!open());
            if (open())
                send('following_onlines');
        },
        invite(titleName) {
            send("invite", util_1.titleNameToId(titleName));
            setTab();
        },
        redraw,
        trans
    };
}
exports.ctrl = ctrl;
;
function view(ctrl) {
    const candidates = ctrl.candidates();
    return modal_1.modal({
        class: 'study__invite',
        onClose() {
            ctrl.open(false);
            ctrl.redraw();
        },
        content: [
            snabbdom_1.h('h2', ctrl.trans.noarg('inviteToTheStudy')),
            snabbdom_1.h('p.info', { attrs: { 'data-icon': '' } }, ctrl.trans.noarg('pleaseOnlyInvitePeopleYouKnow')),
            snabbdom_1.h('div.input-wrapper', [
                snabbdom_1.h('input', {
                    attrs: { placeholder: ctrl.trans.noarg('searchByUsername') },
                    hook: util_1.onInsert(el => {
                        window.lichess.userAutocomplete($(el), {
                            tag: 'span',
                            onSelect(v) {
                                ctrl.invite(v.name);
                                $(el).typeahead('close');
                                el.value = '';
                                ctrl.redraw();
                            }
                        });
                    })
                })
            ]),
            candidates.length ? snabbdom_1.h('div.users', candidates.map(function (username) {
                return snabbdom_1.h('span.button.button-metal', {
                    key: username,
                    hook: util_1.bind('click', _ => ctrl.invite(username))
                }, username);
            })) : undefined
        ]
    });
}
exports.view = view;

},{"../modal":63,"../util":110,"common":131,"snabbdom":35}],84:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const chessground_1 = require("chessground");
const util_1 = require("chessground/util");
const studyXhr_1 = require("./studyXhr");
const util_2 = require("../util");
class MultiBoardCtrl {
    constructor(studyId, redraw, trans) {
        this.studyId = studyId;
        this.redraw = redraw;
        this.trans = trans;
        this.loading = false;
        this.page = 1;
        this.playing = false;
        this.setPage = (page) => {
            if (this.page != page) {
                this.page = page;
                this.reload();
            }
        };
        this.nextPage = () => this.setPage(this.page + 1);
        this.prevPage = () => this.setPage(this.page - 1);
        this.lastPage = () => { if (this.pager)
            this.setPage(this.pager.nbPages); };
        this.setPlaying = (v) => {
            this.playing = v;
            this.reload();
        };
    }
    addNode(pos, node) {
        const cp = this.pager && this.pager.currentPageResults.find(cp => cp.id == pos.chapterId);
        if (cp && cp.playing) {
            cp.fen = node.fen;
            cp.lastMove = node.uci;
            this.redraw();
        }
    }
    reload(onInsert) {
        if (this.pager && !onInsert) {
            this.loading = true;
            this.redraw();
        }
        studyXhr_1.multiBoard(this.studyId, this.page, this.playing).then(p => {
            this.pager = p;
            if (p.nbPages < this.page) {
                if (!p.nbPages)
                    this.page = 1;
                else
                    this.setPage(p.nbPages);
            }
            this.loading = false;
            this.redraw();
        });
    }
}
exports.MultiBoardCtrl = MultiBoardCtrl;
function view(ctrl, study) {
    return snabbdom_1.h('div.study__multiboard', {
        class: { loading: ctrl.loading, nopager: !ctrl.pager },
        hook: {
            insert() { ctrl.reload(true); }
        }
    }, ctrl.pager ? renderPager(ctrl.pager, study) : [util_2.spinner()]);
}
exports.view = view;
function renderPager(pager, study) {
    const ctrl = study.multiBoard;
    return [
        snabbdom_1.h('div.top', [
            renderPagerNav(pager, ctrl),
            renderPlayingToggle(ctrl)
        ]),
        snabbdom_1.h('div.now-playing', pager.currentPageResults.map(makePreview(study)))
    ];
}
function renderPlayingToggle(ctrl) {
    return snabbdom_1.h('label.playing', [
        snabbdom_1.h('input', {
            attrs: { type: 'checkbox' },
            hook: util_2.bind('change', e => {
                ctrl.setPlaying(e.target.checked);
            })
        }),
        ctrl.trans.noarg('playing')
    ]);
}
function renderPagerNav(pager, ctrl) {
    const page = ctrl.page, from = Math.min(pager.nbResults, (page - 1) * pager.maxPerPage + 1), to = Math.min(pager.nbResults, page * pager.maxPerPage);
    return snabbdom_1.h('div.pager', [
        pagerButton(ctrl.trans.noarg('first'), 'W', () => ctrl.setPage(1), page > 1, ctrl),
        pagerButton(ctrl.trans.noarg('previous'), 'Y', ctrl.prevPage, page > 1, ctrl),
        snabbdom_1.h('span.page', `${from}-${to} / ${pager.nbResults}`),
        pagerButton(ctrl.trans.noarg('next'), 'X', ctrl.nextPage, page < pager.nbPages, ctrl),
        pagerButton(ctrl.trans.noarg('last'), 'V', ctrl.lastPage, page < pager.nbPages, ctrl)
    ]);
}
function pagerButton(text, icon, click, enable, ctrl) {
    return snabbdom_1.h('button.fbt', {
        attrs: {
            'data-icon': icon,
            disabled: !enable,
            title: text
        },
        hook: util_2.bind('mousedown', click, ctrl.redraw)
    });
}
function makePreview(study) {
    return (preview) => {
        const contents = preview.players ? [
            makePlayer(preview.players[util_1.opposite(preview.orientation)]),
            makeCg(preview),
            makePlayer(preview.players[preview.orientation])
        ] : [
            snabbdom_1.h('div.name', preview.name),
            makeCg(preview)
        ];
        return snabbdom_1.h('a.' + preview.id, {
            attrs: { title: preview.name },
            class: { active: !study.multiBoard.loading && study.vm.chapterId == preview.id && (!study.relay || !study.relay.intro.active) },
            hook: util_2.bind('mousedown', _ => study.setChapter(preview.id))
        }, contents);
    };
}
function makePlayer(player) {
    return snabbdom_1.h('div.player', [
        player.title ? `${player.title} ${player.name}` : player.name,
        player.rating && snabbdom_1.h('span', '' + player.rating)
    ]);
}
function uciToLastMove(lm) {
    return lm ? [lm[0] + lm[1], lm[2] + lm[3]] : undefined;
}
function makeCg(preview) {
    return snabbdom_1.h('div.mini-board.cg-wrap.is2d', {
        hook: {
            insert(vnode) {
                const cg = chessground_1.Chessground(vnode.elm, {
                    coordinates: false,
                    drawable: { enabled: false, visible: false },
                    resizable: false,
                    viewOnly: true,
                    orientation: preview.orientation,
                    fen: preview.fen,
                    lastMove: uciToLastMove(preview.lastMove)
                });
                vnode.data.cp = { cg, fen: preview.fen };
            },
            postpatch(old, vnode) {
                if (old.data.cp.fen !== preview.fen) {
                    old.data.cp.cg.set({
                        fen: preview.fen,
                        lastMove: uciToLastMove(preview.lastMove)
                    });
                    old.data.cp.fen = preview.fen;
                }
                vnode.data.cp = old.data.cp;
            }
        }
    });
}

},{"../util":110,"./studyXhr":105,"chessground":5,"chessground/util":18,"snabbdom":35}],85:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
function ctrl(redraw) {
    let current;
    let timeout;
    return {
        set(n) {
            clearTimeout(timeout);
            current = n;
            timeout = setTimeout(function () {
                current = undefined;
                redraw();
            }, n.duration);
        },
        get: () => current
    };
}
exports.ctrl = ctrl;
;
function view(ctrl) {
    const c = ctrl.get();
    return c ? snabbdom_1.h('div.notif.' + c.class, c.text) : undefined;
}
exports.view = view;
;

},{"snabbdom":35}],86:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const tree_1 = require("tree");
const clocks_1 = require("../clocks");
const studyChapters_1 = require("./studyChapters");
function default_1(ctrl) {
    const study = ctrl.study;
    if (!study || ctrl.embed)
        return;
    const tags = study.data.chapter.tags, playerNames = {
        white: studyChapters_1.findTag(tags, 'white'),
        black: studyChapters_1.findTag(tags, 'black')
    };
    if (!playerNames.white && !playerNames.black && !tree_1.ops.findInMainline(ctrl.tree.root, n => !!n.clock))
        return;
    const clocks = clocks_1.default(ctrl), ticking = !studyChapters_1.isFinished(study.data.chapter) && ctrl.turnColor();
    return ['white', 'black'].map(color => renderPlayer(tags, clocks, playerNames, color, ticking === color, ctrl.bottomColor() !== color));
}
exports.default = default_1;
function renderPlayer(tags, clocks, playerNames, color, ticking, top) {
    const title = studyChapters_1.findTag(tags, `${color}title`), elo = studyChapters_1.findTag(tags, `${color}elo`), result = studyChapters_1.resultOf(tags, color === 'white');
    return snabbdom_1.h(`div.study__player.study__player-${top ? 'top' : 'bot'}`, {
        class: { ticking }
    }, [
        snabbdom_1.h('div.left', [
            result && snabbdom_1.h('span.result', result),
            snabbdom_1.h('span.info', [
                title && snabbdom_1.h('span.title', title + ' '),
                snabbdom_1.h('span.name', playerNames[color]),
                elo && snabbdom_1.h('span.elo', elo)
            ])
        ]),
        clocks && clocks[color === 'white' ? 0 : 1]
    ]);
}

},{"../clocks":44,"./studyChapters":95,"snabbdom":35,"tree":142}],87:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let baseUrl;
function make(file) {
    baseUrl = baseUrl || $('body').data('asset-url') + '/assets/sound/';
    const sound = new window.Howl({
        src: [
            baseUrl + file + '.ogg',
            baseUrl + file + '.mp3'
        ]
    });
    return function () {
        if (window.lichess.sound.set() !== 'silent')
            sound.play();
    };
}
;
function default_1() {
    return {
        success: make('other/energy3'),
        failure: make('other/failure2')
    };
}
exports.default = default_1;

},{}],88:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const xhr = require("../studyXhr");
const common_1 = require("common");
const storage_1 = require("common/storage");
const studyPracticeSuccess_1 = require("./studyPracticeSuccess");
const sound_1 = require("./sound");
const util_1 = require("../../util");
function default_1(root, studyData, data) {
    const goal = common_1.prop(root.data.practiceGoal), nbMoves = common_1.prop(0), 
    // null = ongoing, true = win, false = fail
    success = common_1.prop(null), sound = sound_1.default(), analysisUrl = common_1.prop(''), autoNext = storage_1.storedProp('practice-auto-next', true);
    function onLoad() {
        root.showAutoShapes = util_1.readOnlyProp(true);
        root.showGauge = util_1.readOnlyProp(true);
        root.showComputer = util_1.readOnlyProp(true);
        goal(root.data.practiceGoal);
        nbMoves(0);
        success(null);
        const chapter = studyData.chapter;
        history.replaceState(null, chapter.name, data.url + '/' + chapter.id);
        analysisUrl('/analysis/standard/' + root.node.fen.replace(/ /g, '_') + '?color=' + root.bottomColor());
    }
    onLoad();
    function computeNbMoves() {
        let plies = root.node.ply - root.tree.root.ply;
        if (root.bottomColor() !== root.data.player.color)
            plies--;
        return Math.ceil(plies / 2);
    }
    function getStudy() {
        return root.study;
    }
    function checkSuccess() {
        const gamebook = getStudy().gamebookPlay();
        if (gamebook) {
            if (gamebook.state.feedback === 'end')
                onVictory();
            return;
        }
        if (!getStudy().data.chapter.practice) {
            return saveNbMoves();
        }
        if (success() !== null)
            return;
        nbMoves(computeNbMoves());
        const res = success(studyPracticeSuccess_1.default(root, goal(), nbMoves()));
        if (res)
            onVictory();
        else if (res === false)
            onFailure();
    }
    function onVictory() {
        saveNbMoves();
        sound.success();
        if (autoNext())
            setTimeout(goToNext, 1000);
    }
    function saveNbMoves() {
        const chapterId = getStudy().currentChapter().id, former = data.completion[chapterId];
        if (typeof former === 'undefined' || nbMoves() < former) {
            data.completion[chapterId] = nbMoves();
            xhr.practiceComplete(chapterId, nbMoves());
        }
    }
    function goToNext() {
        const next = getStudy().nextChapter();
        if (next)
            getStudy().setChapter(next.id);
    }
    function onFailure() {
        root.node.fail = true;
        sound.failure();
    }
    return {
        onLoad,
        onJump() {
            // reset failure state if no failed move found in mainline history
            if (success() === false && !root.nodeList.find(n => !!n.fail))
                success(null);
            checkSuccess();
        },
        onCeval: checkSuccess,
        data,
        goal,
        success,
        nbMoves,
        reset() {
            root.tree.root.children = [];
            root.userJump('');
            root.practice.reset();
            onLoad();
            root.practice.resume();
        },
        isWhite: root.bottomIsWhite,
        analysisUrl,
        autoNext,
        goToNext
    };
}
exports.default = default_1;

},{"../../util":110,"../studyXhr":105,"./sound":87,"./studyPracticeSuccess":89,"common":131,"common/storage":135}],89:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// returns null if not deep enough to know
function isDrawish(node) {
    if (!hasSolidEval(node))
        return null;
    return !node.ceval.mate && Math.abs(node.ceval.cp) < 150;
}
// returns null if not deep enough to know
function isWinning(node, goalCp, color) {
    if (!hasSolidEval(node))
        return null;
    const cp = node.ceval.mate > 0 ? 99999 : (node.ceval.mate < 0 ? -99999 : node.ceval.cp);
    return color === 'white' ? cp >= goalCp : cp <= goalCp;
}
// returns null if not deep enough to know
function myMateIn(node, color) {
    if (!hasSolidEval(node))
        return null;
    if (!node.ceval.mate)
        return false;
    var mateIn = node.ceval.mate * (color === 'white' ? 1 : -1);
    return mateIn > 0 ? mateIn : false;
}
function hasSolidEval(node) {
    return node.ceval && node.ceval.depth >= 16;
}
function isMate(root) {
    return root.gameOver() === 'checkmate';
}
function isMyMate(root) {
    return isMate(root) && root.turnColor() !== root.bottomColor();
}
function isTheirMate(root) {
    return isMate(root) && root.turnColor() === root.bottomColor();
}
function hasBlundered(comment) {
    return comment && (comment.verdict === 'mistake' || comment.verdict === 'blunder');
}
// returns null = ongoing, true = win, false = fail
function default_1(root, goal, nbMoves) {
    const node = root.node;
    if (!node.uci)
        return null;
    if (isTheirMate(root))
        return false;
    if (isMyMate(root))
        return true;
    if (hasBlundered(root.practice.comment()))
        return false;
    switch (goal.result) {
        case 'drawIn':
        case 'equalIn':
            if (node.threefold)
                return true;
            if (isDrawish(node) === false)
                return false;
            if (nbMoves > goal.moves)
                return false;
            if (root.gameOver() === 'draw')
                return true;
            if (nbMoves >= goal.moves)
                return isDrawish(node);
            break;
        case 'evalIn':
            if (nbMoves >= goal.moves)
                return isWinning(node, goal.cp, root.bottomColor());
            break;
        case 'mateIn':
            if (nbMoves > goal.moves)
                return false;
            const mateIn = myMateIn(node, root.bottomColor());
            if (mateIn === null)
                return null;
            if (!mateIn || mateIn + nbMoves > goal.moves)
                return false;
            break;
        case 'promotion':
            if (!node.uci[4])
                return null;
            return isWinning(node, goal.cp, root.bottomColor());
        case 'mate':
    }
    return null;
}
exports.default = default_1;
;

},{}],90:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const util_1 = require("../../util");
const boolSetting_1 = require("../../boolSetting");
const description_1 = require("../description");
function selector(data) {
    return snabbdom_1.h('select.selector', {
        hook: util_1.bind('change', e => {
            location.href = '/practice/' + e.target.value;
        })
    }, [
        snabbdom_1.h('option', {
            attrs: { disabled: true, selected: true }
        }, 'Practice list'),
        ...data.structure.map(function (section) {
            return snabbdom_1.h('optgroup', {
                attrs: { label: section.name }
            }, section.studies.map(function (study) {
                return util_1.option(section.id + '/' + study.slug + '/' + study.id, '', study.name);
            }));
        })
    ]);
}
function renderGoal(practice, inMoves) {
    const goal = practice.goal();
    switch (goal.result) {
        case 'mate':
            return 'Checkmate the opponent';
        case 'mateIn':
            return 'Checkmate the opponent in ' + util_1.plural('move', inMoves);
        case 'drawIn':
            return 'Hold the draw for ' + util_1.plural('more move', inMoves);
        case 'equalIn':
            return 'Equalize in ' + util_1.plural('move', inMoves);
        case 'evalIn':
            if (practice.isWhite() === (goal.cp >= 0))
                return 'Get a winning position in ' + util_1.plural('move', inMoves);
            return 'Defend for ' + util_1.plural('move', inMoves);
        case 'promotion':
            return 'Safely promote your pawn';
    }
}
function underboard(ctrl) {
    if (ctrl.vm.loading)
        return [snabbdom_1.h('div.feedback', util_1.spinner())];
    const p = ctrl.practice, gb = ctrl.gamebookPlay(), pinned = ctrl.data.chapter.description;
    if (gb)
        return pinned ? [snabbdom_1.h('div.feedback.ongoing', [
                snabbdom_1.h('div.comment', { hook: util_1.richHTML(pinned) })
            ])] : [];
    else if (!ctrl.data.chapter.practice)
        return [description_1.view(ctrl, true)];
    switch (p.success()) {
        case true:
            const next = ctrl.nextChapter();
            return [
                snabbdom_1.h('a.feedback.win', next ? {
                    hook: util_1.bind('click', p.goToNext)
                } : {
                    attrs: { href: '/practice' }
                }, [
                    snabbdom_1.h('span', 'Success!'),
                    ctrl.nextChapter() ? 'Go to next exercise' : 'Back to practice menu'
                ])
            ];
        case false:
            return [
                snabbdom_1.h('a.feedback.fail', {
                    hook: util_1.bind('click', p.reset, ctrl.redraw)
                }, [
                    snabbdom_1.h('span', [renderGoal(p, p.goal().moves)]),
                    snabbdom_1.h('strong', 'Click to retry')
                ])
            ];
        default:
            return [
                snabbdom_1.h('div.feedback.ongoing', [
                    snabbdom_1.h('div.goal', [renderGoal(p, p.goal().moves - p.nbMoves())]),
                    pinned ? snabbdom_1.h('div.comment', { hook: util_1.richHTML(pinned) }) : null
                ]),
                boolSetting_1.boolSetting({
                    name: 'Load next exercise immediately',
                    id: 'autoNext',
                    checked: p.autoNext(),
                    change: p.autoNext
                }, ctrl.trans, ctrl.redraw)
            ];
    }
}
exports.underboard = underboard;
function side(ctrl) {
    const current = ctrl.currentChapter(), data = ctrl.practice.data;
    return snabbdom_1.h('div.practice__side', [
        snabbdom_1.h('div.practice__side__title', [
            snabbdom_1.h('i.' + data.study.id),
            snabbdom_1.h('div.text', [
                snabbdom_1.h('h1', data.study.name),
                snabbdom_1.h('em', data.study.desc)
            ])
        ]),
        snabbdom_1.h('div.practice__side__chapters', {
            hook: util_1.bind('click', e => {
                e.preventDefault();
                const target = e.target, id = target.parentNode.getAttribute('data-id') || target.getAttribute('data-id');
                if (id)
                    ctrl.setChapter(id, true);
                return false;
            })
        }, ctrl.chapters.list().map(function (chapter) {
            const loading = ctrl.vm.loading && chapter.id === ctrl.vm.nextChapterId, active = !ctrl.vm.loading && current && current.id === chapter.id, completion = data.completion[chapter.id] >= 0 ? 'done' : 'ongoing';
            return [
                snabbdom_1.h('a.ps__chapter', {
                    key: chapter.id,
                    attrs: {
                        href: data.url + '/' + chapter.id,
                        'data-id': chapter.id
                    },
                    class: { active, loading }
                }, [
                    snabbdom_1.h('span.status.' + completion, {
                        attrs: {
                            'data-icon': ((loading || active) && completion === 'ongoing') ? 'G' : 'E'
                        }
                    }),
                    snabbdom_1.h('h3', chapter.name)
                ])
            ];
        }).reduce((a, b) => a.concat(b), [])),
        snabbdom_1.h('div.finally', [
            snabbdom_1.h('a.back', {
                attrs: {
                    'data-icon': 'I',
                    href: '/practice',
                    title: 'More practice'
                }
            }),
            snabbdom_1.thunk('select.selector', selector, [data])
        ])
    ]);
}
exports.side = side;

},{"../../boolSetting":42,"../../util":110,"../description":78,"snabbdom":35}],91:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const studyChapters_1 = require("../studyChapters");
class RelayCtrl {
    constructor(data, send, redraw, members, chapter) {
        this.data = data;
        this.send = send;
        this.redraw = redraw;
        this.members = members;
        this.log = [];
        this.cooldown = false;
        this.setSync = (v) => {
            this.send('relaySync', v);
            this.redraw();
        };
        this.loading = () => !this.cooldown && this.data.sync.ongoing;
        this.applyChapterRelay = (c, r) => {
            if (this.clockInterval)
                clearInterval(this.clockInterval);
            if (r) {
                c.relay = this.convertDate(r);
                if (!studyChapters_1.isFinished(c))
                    this.clockInterval = setInterval(this.redraw, 1000);
            }
        };
        this.convertDate = (r) => {
            if (typeof r.secondsSinceLastMove !== 'undefined' && !r.lastMoveAt) {
                r.lastMoveAt = Date.now() - r.secondsSinceLastMove * 1000;
            }
            return r;
        };
        this.socketHandlers = {
            relayData: (d) => {
                d.sync.log = this.data.sync.log;
                this.data = d;
                this.redraw();
            },
            relayLog: (event) => {
                if (event.id !== this.data.id)
                    return;
                this.data.sync.log.push(event);
                this.data.sync.log = this.data.sync.log.slice(-20);
                this.cooldown = true;
                setTimeout(() => { this.cooldown = false; this.redraw(); }, 4500);
                this.redraw();
                if (event.error)
                    console.warn(`relay synchronisation error: ${event.error}`);
            }
        };
        this.socketHandler = (t, d) => {
            const handler = this.socketHandlers[t];
            if (handler && d.id === this.data.id) {
                handler(d);
                return true;
            }
            return false;
        };
        this.applyChapterRelay(chapter, chapter.relay);
        this.intro = {
            exists: !!data.markup,
            active: !!data.markup && (location.pathname.match(/\//g) || []).length < 4,
            disable: () => { this.intro.active = false; }
        };
    }
}
exports.default = RelayCtrl;

},{"../studyChapters":95}],92:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const util_1 = require("../../util");
const multiBoard_1 = require("../multiBoard");
function default_1(ctrl) {
    const study = ctrl.study;
    const relay = study && study.relay;
    if (study && relay && relay.intro.active)
        return snabbdom_1.h('div.intro', [
            snabbdom_1.h('div.intro__text', [
                snabbdom_1.h('h1', study.data.name),
                snabbdom_1.h('div', {
                    hook: util_1.innerHTML(relay.data.markup, () => relay.data.markup)
                })
            ]),
            multiBoard_1.view(study.multiBoard, study)
        ]);
}
exports.default = default_1;

},{"../../util":110,"../multiBoard":84,"snabbdom":35}],93:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const util_1 = require("../../util");
function default_1(ctrl) {
    if (ctrl.members.canContribute())
        return snabbdom_1.h('div.relay-admin', {
            hook: util_1.onInsert(_ => window.lichess.loadCssPath('analyse.relay-admin'))
        }, [
            snabbdom_1.h('h2', [
                snabbdom_1.h('span.text', { attrs: util_1.dataIcon('') }, 'Broadcast manager'),
                snabbdom_1.h('a', {
                    attrs: {
                        href: `/broadcast/${ctrl.data.slug}/${ctrl.data.id}/edit`,
                        'data-icon': '%'
                    }
                })
            ]),
            ctrl.data.sync.url ? (ctrl.data.sync.ongoing ? stateOn : stateOff)(ctrl) : null,
            renderLog(ctrl)
        ]);
}
exports.default = default_1;
function logSuccess(e) {
    return [
        e.moves ? snabbdom_1.h('strong', '' + e.moves) : e.moves,
        ` new move${e.moves > 1 ? 's' : ''}`
    ];
}
function renderLog(ctrl) {
    const dateFormatter = getDateFormatter();
    const logLines = ctrl.data.sync.log.slice(0).reverse().map(e => {
        const err = e.error && snabbdom_1.h('a', {
            attrs: {
                href: ctrl.data.sync.url,
                target: '_blank'
            }
        }, e.error);
        return snabbdom_1.h('div' + (err ? '.err' : ''), {
            key: e.at,
            attrs: util_1.dataIcon(err ? 'j' : 'E')
        }, [
            snabbdom_1.h('div', [
                ...(err ? [err] : logSuccess(e)),
                snabbdom_1.h('time', dateFormatter(new Date(e.at)))
            ])
        ]);
    });
    if (ctrl.loading())
        logLines.unshift(snabbdom_1.h('div.load', [
            snabbdom_1.h('i.ddloader'),
            'Polling source...'
        ]));
    return snabbdom_1.h('div.log', logLines);
}
function stateOn(ctrl) {
    return snabbdom_1.h('div.state.on.clickable', {
        hook: util_1.bind('click', _ => ctrl.setSync(false)),
        attrs: util_1.dataIcon('B')
    }, [
        snabbdom_1.h('div', [
            'Connected to source',
            snabbdom_1.h('br'),
            ctrl.data.sync.url.replace(/https?:\/\//, '')
        ])
    ]);
}
function stateOff(ctrl) {
    return snabbdom_1.h('div.state.off.clickable', {
        hook: util_1.bind('click', _ => ctrl.setSync(true)),
        attrs: util_1.dataIcon('G')
    }, [
        snabbdom_1.h('div.fat', 'Click to connect')
    ]);
}
let cachedDateFormatter;
function getDateFormatter() {
    if (!cachedDateFormatter)
        cachedDateFormatter = (window.Intl && Intl.DateTimeFormat) ?
            new Intl.DateTimeFormat(document.documentElement.lang, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric'
            }).format : function (d) { return d.toLocaleString(); };
    return cachedDateFormatter;
}

},{"../../util":110,"snabbdom":35}],94:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const util_1 = require("../util");
const common_1 = require("common");
const li = window.lichess;
function ctrl(root, chapterId) {
    const requested = common_1.prop(false), lastPly = common_1.prop(false), chartEl = common_1.prop(null);
    function unselect(chart) {
        chart.getSelectedPoints().forEach(p => p.select(false));
    }
    li.pubsub.on('analysis.change', (_fen, _path, mainlinePly) => {
        if (!li.advantageChart || lastPly() === mainlinePly)
            return;
        const lp = lastPly(typeof mainlinePly === 'undefined' ? lastPly() : mainlinePly), el = chartEl();
        if (el && window.Highcharts) {
            const $chart = $(el);
            if ($chart.length) {
                const chart = $chart.highcharts();
                if (chart) {
                    if (lp === false)
                        unselect(chart);
                    else {
                        const point = chart.series[0].data[lp - 1 - root.tree.root.ply];
                        if (common_1.defined(point))
                            point.select();
                        else
                            unselect(chart);
                    }
                }
                else
                    lastPly(false);
            }
        }
        else
            lastPly(false);
    });
    return {
        root,
        reset() {
            requested(false);
            lastPly(false);
        },
        chapterId,
        onMergeAnalysisData() {
            if (li.advantageChart)
                li.advantageChart.update(root.data);
        },
        request() {
            root.socket.send('requestAnalysis', chapterId());
            requested(true);
        },
        requested,
        lastPly,
        chartEl
    };
}
exports.ctrl = ctrl;
function view(ctrl) {
    const analysis = ctrl.root.data.analysis;
    if (!ctrl.root.showComputer())
        return disabled();
    if (!analysis)
        return ctrl.requested() ? requested() : requestButton(ctrl);
    return snabbdom_1.h('div.study__server-eval.ready.' + analysis.id, {
        hook: util_1.onInsert(el => {
            ctrl.lastPly(false);
            li.requestIdleCallback(() => {
                li.loadScript('javascripts/chart/acpl.js').then(() => {
                    li.advantageChart(ctrl.root.data, ctrl.root.trans, el);
                    ctrl.chartEl(el);
                });
            });
        })
    }, [snabbdom_1.h('div.study__message', util_1.spinner())]);
}
exports.view = view;
function disabled() {
    return snabbdom_1.h('div.study__server-eval.disabled.padded', 'You disabled computer analysis.');
}
function requested() {
    return snabbdom_1.h('div.study__server-eval.requested.padded', util_1.spinner());
}
function requestButton(ctrl) {
    const root = ctrl.root;
    return snabbdom_1.h('div.study__message', root.mainline.length < 5 ? snabbdom_1.h('p', root.trans.noarg('theChapterIsTooShortToBeAnalysed')) : (!root.study.members.canContribute() ? [root.trans.noarg('onlyContributorsCanRequestAnalysis')] : [
        snabbdom_1.h('p', [
            root.trans.noarg('getAFullComputerAnalysis'),
            snabbdom_1.h('br'),
            root.trans.noarg('makeSureTheChapterIsComplete')
        ]),
        snabbdom_1.h('a.button.text', {
            attrs: {
                'data-icon': '',
                disabled: root.mainline.length < 5
            },
            hook: util_1.bind('click', ctrl.request, root.redraw)
        }, root.trans.noarg('requestAComputerAnalysis'))
    ]));
}

},{"../util":110,"common":131,"snabbdom":35}],95:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const common_1 = require("common");
const util_1 = require("../util");
const chapterNewForm_1 = require("./chapterNewForm");
const chapterEditForm_1 = require("./chapterEditForm");
function ctrl(initChapters, send, setTab, chapterConfig, root) {
    const list = common_1.prop(initChapters);
    const newForm = chapterNewForm_1.ctrl(send, list, setTab, root);
    const editForm = chapterEditForm_1.ctrl(send, chapterConfig, root.trans, root.redraw);
    const localPaths = {};
    return {
        newForm,
        editForm,
        list,
        get(id) {
            return list().find(c => c.id === id);
        },
        size() {
            return list().length;
        },
        sort(ids) {
            send("sortChapters", ids);
        },
        firstChapterId() {
            return list()[0].id;
        },
        toggleNewForm() {
            if (newForm.vm.open || list().length < 64)
                newForm.toggle();
            else
                alert("You have reached the limit of 64 chapters per study. Please create a new study.");
        },
        localPaths
    };
}
exports.ctrl = ctrl;
function isFinished(c) {
    const result = findTag(c.tags, 'result');
    return result && result !== '*';
}
exports.isFinished = isFinished;
function findTag(tags, name) {
    const t = tags.find(t => t[0].toLowerCase() === name);
    return t && t[1];
}
exports.findTag = findTag;
function resultOf(tags, isWhite) {
    switch (findTag(tags, 'result')) {
        case '1-0': return isWhite ? '1' : '0';
        case '0-1': return isWhite ? '0' : '1';
        case '1/2-1/2': return '1/2';
        default: return;
    }
}
exports.resultOf = resultOf;
function view(ctrl) {
    const canContribute = ctrl.members.canContribute(), configButton = canContribute ? snabbdom_1.h('act', { attrs: util_1.dataIcon('%') }) : null, current = ctrl.currentChapter();
    function update(vnode) {
        const newCount = ctrl.chapters.list().length, vData = vnode.data.li, el = vnode.elm;
        if (vData.count !== newCount) {
            if (current.id !== ctrl.chapters.firstChapterId()) {
                util_1.scrollTo(el, el.querySelector('.active'));
            }
        }
        else if (ctrl.vm.loading && vData.loadingId !== ctrl.vm.nextChapterId) {
            vData.loadingId = ctrl.vm.nextChapterId;
            util_1.scrollTo(el, el.querySelector('.loading'));
        }
        vData.count = newCount;
        if (canContribute && newCount > 1 && !vData.sortable) {
            const makeSortable = function () {
                vData.sortable = window['Sortable'].create(el, {
                    draggable: '.draggable',
                    handle: window.lichess.hasTouchEvents ? 'span' : undefined,
                    onSort() {
                        ctrl.chapters.sort(vData.sortable.toArray());
                    }
                });
            };
            if (window['Sortable'])
                makeSortable();
            else
                window.lichess.loadScript('javascripts/vendor/Sortable.min.js').then(makeSortable);
        }
    }
    const introActive = ctrl.relay && ctrl.relay.intro.active;
    return snabbdom_1.h('div.study__chapters', {
        hook: {
            insert(vnode) {
                vnode.elm.addEventListener('click', e => {
                    const target = e.target;
                    const id = target.parentNode.getAttribute('data-id') || target.getAttribute('data-id');
                    if (!id)
                        return;
                    if (target.tagName === 'ACT')
                        ctrl.chapters.editForm.toggle(ctrl.chapters.get(id));
                    else
                        ctrl.setChapter(id);
                });
                vnode.data.li = {};
                update(vnode);
                window.lichess.pubsub.emit('chat.resize');
            },
            postpatch(old, vnode) {
                vnode.data.li = old.data.li;
                update(vnode);
            },
            destroy: vnode => {
                const sortable = vnode.data.li.sortable;
                if (sortable)
                    sortable.destroy();
            }
        }
    }, ctrl.chapters.list().map((chapter, i) => {
        const editing = ctrl.chapters.editForm.isEditing(chapter.id), loading = ctrl.vm.loading && chapter.id === ctrl.vm.nextChapterId, active = !ctrl.vm.loading && current && !introActive && current.id === chapter.id;
        return snabbdom_1.h('div', {
            key: chapter.id,
            attrs: { 'data-id': chapter.id },
            class: { active, editing, loading, draggable: canContribute }
        }, [
            snabbdom_1.h('span', loading ? snabbdom_1.h('span.ddloader') : ['' + (i + 1)]),
            snabbdom_1.h('h3', chapter.name),
            configButton
        ]);
    }).concat(ctrl.members.canContribute() ? [
        snabbdom_1.h('div.add', {
            hook: util_1.bind('click', ctrl.chapters.toggleNewForm, ctrl.redraw)
        }, [
            snabbdom_1.h('span', util_1.iconTag('O')),
            snabbdom_1.h('h3', ctrl.trans.noarg('addNewChapter'))
        ])
    ] : []));
}
exports.view = view;

},{"../util":110,"./chapterEditForm":75,"./chapterNewForm":76,"common":131,"snabbdom":35}],96:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const util_1 = require("../util");
function authorDom(author) {
    if (!author)
        return 'Unknown';
    if (!author.name)
        return author;
    return snabbdom_1.h('span.user-link.ulpt', {
        attrs: { 'data-href': '/@/' + author.id }
    }, author.name);
}
function authorText(author) {
    if (!author)
        return 'Unknown';
    if (!author.name)
        return author;
    return author.name;
}
exports.authorText = authorText;
function currentComments(ctrl, includingMine) {
    if (!ctrl.node.comments)
        return;
    const node = ctrl.node, study = ctrl.study, chapter = study.currentChapter(), comments = node.comments;
    if (!comments.length)
        return;
    return snabbdom_1.h('div', comments.map((comment) => {
        const by = comment.by;
        const isMine = by.id && ctrl.opts.userId === by.id;
        if (!includingMine && isMine)
            return;
        const canDelete = isMine || study.members.isOwner();
        return snabbdom_1.h('div.study__comment.' + comment.id, [
            canDelete && study.vm.mode.write ? snabbdom_1.h('a.edit', {
                attrs: {
                    'data-icon': 'q',
                    title: 'Delete'
                },
                hook: util_1.bind('click', _ => {
                    if (confirm('Delete ' + authorText(by) + '\'s comment?'))
                        study.commentForm.delete(chapter.id, ctrl.path, comment.id);
                }, ctrl.redraw)
            }) : null,
            isMine && study.vm.mode.write ? snabbdom_1.h('a.edit', {
                attrs: {
                    'data-icon': 'm',
                    title: 'Edit'
                },
                hook: util_1.bind('click', _ => {
                    study.commentForm.start(chapter.id, ctrl.path, node);
                }, ctrl.redraw)
            }) : null,
            authorDom(by),
            ...(node.san ? [
                ' on ',
                snabbdom_1.h('span.node', util_1.nodeFullName(node))
            ] : []),
            ': ',
            snabbdom_1.h('div.text', { hook: util_1.richHTML(comment.text) })
        ]);
    }));
}
exports.currentComments = currentComments;

},{"../util":110,"snabbdom":35}],97:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("common");
const throttle_1 = require("common/throttle");
const studyMembers_1 = require("./studyMembers");
const studyChapters_1 = require("./studyChapters");
const studyPracticeCtrl_1 = require("./practice/studyPracticeCtrl");
const commentForm_1 = require("./commentForm");
const studyGlyph_1 = require("./studyGlyph");
const studyForm_1 = require("./studyForm");
const notif_1 = require("./notif");
const studyShare_1 = require("./studyShare");
const studyTags_1 = require("./studyTags");
const serverEval_1 = require("./serverEval");
const tours = require("./studyTour");
const xhr = require("./studyXhr");
const tree_1 = require("tree");
const gamebookPlayCtrl_1 = require("./gamebook/gamebookPlayCtrl");
const description_1 = require("./description");
const relayCtrl_1 = require("./relay/relayCtrl");
const multiBoard_1 = require("./multiBoard");
const li = window.lichess;
// data.position.path represents the server state
// ctrl.path is the client state
function default_1(data, ctrl, tagTypes, practiceData, relayData) {
    const send = ctrl.socket.send;
    const redraw = ctrl.redraw;
    const vm = (() => {
        const isManualChapter = data.chapter.id !== data.position.chapterId;
        const sticked = data.features.sticky && !ctrl.initialPath && !isManualChapter && !practiceData;
        return {
            loading: false,
            tab: common_1.prop(relayData || data.chapters.length > 1 ? 'chapters' : 'members'),
            toolTab: common_1.prop('tags'),
            chapterId: sticked ? data.position.chapterId : data.chapter.id,
            // path is at ctrl.path
            mode: {
                sticky: sticked,
                write: true
            },
            // how many events missed because sync=off
            behind: 0,
            // how stale is the study
            updatedAt: Date.now() - data.secondsSinceUpdate * 1000,
            gamebookOverride: undefined
        };
    })();
    const notif = notif_1.ctrl(redraw);
    function startTour() {
        tours.study(ctrl);
    }
    ;
    const members = studyMembers_1.ctrl({
        initDict: data.members,
        myId: practiceData ? null : ctrl.opts.userId,
        ownerId: data.ownerId,
        send,
        tab: vm.tab,
        startTour,
        notif,
        onBecomingContributor() {
            vm.mode.write = true;
        },
        redraw,
        trans: ctrl.trans
    });
    const chapters = studyChapters_1.ctrl(data.chapters, send, () => vm.tab('chapters'), chapterId => xhr.chapterConfig(data.id, chapterId), ctrl);
    function currentChapter() {
        return chapters.get(vm.chapterId);
    }
    ;
    function isChapterOwner() {
        return ctrl.opts.userId === data.chapter.ownerId;
    }
    ;
    const multiBoard = new multiBoard_1.MultiBoardCtrl(data.id, redraw, ctrl.trans);
    const relay = relayData ? new relayCtrl_1.default(relayData, send, redraw, members, data.chapter) : undefined;
    const form = studyForm_1.ctrl((d, isNew) => {
        send("editStudy", d);
        if (isNew && data.chapter.setup.variant.key === 'standard' && ctrl.mainline.length === 1 && !data.chapter.setup.fromFen && !relay)
            chapters.newForm.openInitial();
    }, () => data, ctrl.trans, redraw, relay);
    function isWriting() {
        return vm.mode.write && !isGamebookPlay();
    }
    function makeChange(t, d) {
        if (isWriting()) {
            send(t, d);
            return true;
        }
        return vm.mode.sticky = false;
    }
    ;
    const commentForm = commentForm_1.ctrl(ctrl);
    const glyphForm = studyGlyph_1.ctrl(ctrl);
    const tags = studyTags_1.ctrl(ctrl, () => data.chapter, tagTypes);
    const studyDesc = new description_1.DescriptionCtrl(data.description, t => {
        data.description = t;
        send("descStudy", t);
    }, redraw);
    const chapterDesc = new description_1.DescriptionCtrl(data.chapter.description, t => {
        data.chapter.description = t;
        send("descChapter", { id: vm.chapterId, desc: t });
    }, redraw);
    const serverEval = serverEval_1.ctrl(ctrl, () => vm.chapterId);
    function addChapterId(req) {
        req.ch = vm.chapterId;
        return req;
    }
    function isGamebookPlay() {
        return data.chapter.gamebook && vm.gamebookOverride !== 'analyse' &&
            (vm.gamebookOverride === 'play' || !members.canContribute());
    }
    if (vm.mode.sticky && !isGamebookPlay())
        ctrl.userJump(data.position.path);
    else if (data.chapter.relay && !ctrl.initialPath)
        ctrl.userJump(data.chapter.relay.path);
    function configureAnalysis() {
        if (ctrl.embed)
            return;
        const canContribute = members.canContribute();
        // unwrite if member lost privileges
        vm.mode.write = vm.mode.write && canContribute;
        li.pubsub.emit('chat.writeable', data.features.chat);
        li.pubsub.emit('chat.permissions', { local: canContribute });
        li.pubsub.emit('palantir.toggle', data.features.chat && !!members.myMember());
        const computer = !isGamebookPlay() && !!(data.chapter.features.computer || data.chapter.practice);
        if (!computer)
            ctrl.getCeval().enabled(false);
        ctrl.getCeval().allowed(computer);
        if (!data.chapter.features.explorer)
            ctrl.explorer.disable();
        ctrl.explorer.allowed(data.chapter.features.explorer);
    }
    ;
    configureAnalysis();
    function configurePractice() {
        if (!data.chapter.practice && ctrl.practice)
            ctrl.togglePractice();
        if (data.chapter.practice)
            ctrl.restartPractice();
        if (practice)
            practice.onLoad();
    }
    ;
    function onReload(d) {
        const s = d.study;
        const prevPath = ctrl.path;
        const sameChapter = data.chapter.id === s.chapter.id;
        vm.mode.sticky = (vm.mode.sticky && s.features.sticky) || (!data.features.sticky && s.features.sticky);
        if (vm.mode.sticky)
            vm.behind = 0;
        'position name visibility features settings chapter likes liked description'.split(' ').forEach(key => {
            data[key] = s[key];
        });
        chapterDesc.set(data.chapter.description);
        studyDesc.set(data.description);
        document.title = data.name;
        members.dict(s.members);
        chapters.list(s.chapters);
        ctrl.flipped = false;
        const merge = !vm.mode.write && sameChapter;
        ctrl.reloadData(d.analysis, merge);
        vm.gamebookOverride = undefined;
        configureAnalysis();
        vm.loading = false;
        instanciateGamebookPlay();
        if (relay)
            relay.applyChapterRelay(data.chapter, s.chapter.relay);
        let nextPath;
        if (vm.mode.sticky) {
            vm.chapterId = data.position.chapterId;
            nextPath = ((vm.justSetChapterId === vm.chapterId) && chapters.localPaths[vm.chapterId]) || data.position.path;
        }
        else {
            nextPath = sameChapter ? prevPath : (data.chapter.relay ? data.chapter.relay.path : (chapters.localPaths[vm.chapterId] || tree_1.path.root));
        }
        // path could be gone (because of subtree deletion), go as far as possible
        ctrl.userJump(ctrl.tree.longestValidPath(nextPath));
        vm.justSetChapterId = undefined;
        configurePractice();
        serverEval.reset();
        commentForm.onSetPath(data.chapter.id, ctrl.path, ctrl.node, false);
        redraw();
        ctrl.startCeval();
    }
    ;
    const xhrReload = throttle_1.default(700, () => {
        vm.loading = true;
        return xhr.reload(practice ? 'practice/load' : 'study', data.id, vm.mode.sticky ? undefined : vm.chapterId).then(onReload, li.reload);
    });
    const onSetPath = throttle_1.default(300, (path) => {
        if (vm.mode.sticky && path !== data.position.path)
            makeChange("setPath", addChapterId({
                path
            }));
    });
    if (members.canContribute())
        form.openIfNew();
    function currentNode() {
        return ctrl.node;
    }
    ;
    const share = studyShare_1.ctrl(data, currentChapter, currentNode, redraw, ctrl.trans);
    const practice = practiceData && studyPracticeCtrl_1.default(ctrl, data, practiceData);
    let gamebookPlay;
    function instanciateGamebookPlay() {
        if (!isGamebookPlay())
            return gamebookPlay = undefined;
        if (gamebookPlay && gamebookPlay.chapterId === vm.chapterId)
            return;
        gamebookPlay = new gamebookPlayCtrl_1.default(ctrl, vm.chapterId, ctrl.trans, redraw);
        vm.mode.sticky = false;
    }
    instanciateGamebookPlay();
    function mutateCgConfig(config) {
        config.drawable.onChange = shapes => {
            if (vm.mode.write) {
                ctrl.tree.setShapes(shapes, ctrl.path);
                makeChange("shapes", addChapterId({
                    path: ctrl.path,
                    shapes
                }));
            }
            gamebookPlay && gamebookPlay.onShapeChange(shapes);
        };
    }
    function wrongChapter(serverData) {
        if (serverData.p.chapterId !== vm.chapterId) {
            // sticky should really be on the same chapter
            if (vm.mode.sticky && serverData.sticky)
                xhrReload();
            return true;
        }
    }
    function setMemberActive(who) {
        who && members.setActive(who.u);
        vm.updatedAt = Date.now();
    }
    function withPosition(obj) {
        obj.ch = vm.chapterId;
        obj.path = ctrl.path;
        return obj;
    }
    const likeToggler = li.debounce(() => send("like", { liked: data.liked }), 1000);
    const socketHandlers = {
        path(d) {
            const position = d.p, who = d.w;
            setMemberActive(who);
            if (!vm.mode.sticky) {
                vm.behind++;
                return redraw();
            }
            if (position.chapterId !== data.position.chapterId ||
                !ctrl.tree.pathExists(position.path)) {
                return xhrReload();
            }
            data.position.path = position.path;
            if (who && who.s === li.sri)
                return;
            ctrl.userJump(position.path);
            redraw();
        },
        addNode(d) {
            const position = d.p, node = d.n, who = d.w, sticky = d.s;
            setMemberActive(who);
            if (vm.toolTab() == 'multiBoard' || relay && relay.intro.active)
                multiBoard.addNode(d.p, d.n);
            if (sticky && !vm.mode.sticky)
                vm.behind++;
            if (wrongChapter(d)) {
                if (sticky && !vm.mode.sticky)
                    redraw();
                return;
            }
            if (sticky && who && who.s === li.sri) {
                data.position.path = position.path + node.id;
                return;
            }
            if (relay)
                relay.applyChapterRelay(data.chapter, d.relay);
            const newPath = ctrl.tree.addNode(node, position.path);
            if (!newPath)
                return xhrReload();
            ctrl.tree.addDests(d.d, newPath, d.o);
            if (sticky)
                data.position.path = newPath;
            if ((sticky && vm.mode.sticky) || (position.path === ctrl.path &&
                position.path === tree_1.path.fromNodeList(ctrl.mainline)))
                ctrl.jump(newPath);
            redraw();
        },
        deleteNode(d) {
            const position = d.p, who = d.w;
            setMemberActive(who);
            if (wrongChapter(d))
                return;
            // deleter already has it done
            if (who && who.s === li.sri)
                return;
            if (!ctrl.tree.pathExists(d.p.path))
                return xhrReload();
            ctrl.tree.deleteNodeAt(position.path);
            if (vm.mode.sticky)
                ctrl.jump(ctrl.path);
            redraw();
        },
        promote(d) {
            const position = d.p, who = d.w;
            setMemberActive(who);
            if (wrongChapter(d))
                return;
            if (who && who.s === li.sri)
                return;
            if (!ctrl.tree.pathExists(d.p.path))
                return xhrReload();
            ctrl.tree.promoteAt(position.path, d.toMainline);
            if (vm.mode.sticky)
                ctrl.jump(ctrl.path);
            redraw();
        },
        reload: xhrReload,
        changeChapter(d) {
            setMemberActive(d.w);
            if (!vm.mode.sticky)
                vm.behind++;
            data.position = d.p;
            if (vm.mode.sticky)
                xhrReload();
            else
                redraw();
        },
        updateChapter(d) {
            setMemberActive(d.w);
            xhrReload();
        },
        descChapter(d) {
            setMemberActive(d.w);
            if (d.w && d.w.s === li.sri)
                return;
            if (data.chapter.id === d.chapterId) {
                data.chapter.description = d.desc;
                chapterDesc.set(d.desc);
            }
            redraw();
        },
        descStudy(d) {
            setMemberActive(d.w);
            if (d.w && d.w.s === li.sri)
                return;
            data.description = d.desc;
            studyDesc.set(d.desc);
            redraw();
        },
        addChapter(d) {
            setMemberActive(d.w);
            if (d.s && !vm.mode.sticky)
                vm.behind++;
            if (d.s)
                data.position = d.p;
            else if (d.w && d.w.s === li.sri) {
                vm.mode.write = true;
                vm.chapterId = d.p.chapterId;
            }
            xhrReload();
        },
        members(d) {
            members.update(d);
            configureAnalysis();
            redraw();
        },
        chapters(d) {
            chapters.list(d);
            if (!currentChapter()) {
                vm.chapterId = d[0].id;
                if (!vm.mode.sticky)
                    xhrReload();
            }
            redraw();
        },
        shapes(d) {
            const position = d.p, who = d.w;
            setMemberActive(who);
            if (wrongChapter(d))
                return;
            if (who && who.s === li.sri)
                return;
            ctrl.tree.setShapes(d.s, ctrl.path);
            if (ctrl.path === position.path)
                ctrl.withCg(cg => cg.setShapes(d.s));
            redraw();
        },
        validationError(d) {
            alert(d.error);
        },
        setComment(d) {
            const position = d.p, who = d.w;
            setMemberActive(who);
            if (wrongChapter(d))
                return;
            ctrl.tree.setCommentAt(d.c, position.path);
            redraw();
        },
        setTags(d) {
            setMemberActive(d.w);
            if (d.chapterId !== vm.chapterId)
                return;
            data.chapter.tags = d.tags;
            redraw();
        },
        deleteComment(d) {
            const position = d.p, who = d.w;
            setMemberActive(who);
            if (wrongChapter(d))
                return;
            ctrl.tree.deleteCommentAt(d.id, position.path);
            redraw();
        },
        glyphs(d) {
            const position = d.p, who = d.w;
            setMemberActive(who);
            if (wrongChapter(d))
                return;
            ctrl.tree.setGlyphsAt(d.g, position.path);
            redraw();
        },
        clock(d) {
            const position = d.p, who = d.w;
            setMemberActive(who);
            if (wrongChapter(d))
                return;
            ctrl.tree.setClockAt(d.c, position.path);
            redraw();
        },
        forceVariation(d) {
            const position = d.p, who = d.w;
            setMemberActive(who);
            if (wrongChapter(d))
                return;
            ctrl.tree.forceVariationAt(position.path, d.force);
            redraw();
        },
        conceal(d) {
            if (wrongChapter(d))
                return;
            data.chapter.conceal = d.ply;
            redraw();
        },
        liking(d) {
            data.likes = d.l.likes;
            if (d.w && d.w.s === li.sri)
                data.liked = d.l.me;
            redraw();
        },
        following_onlines: members.inviteForm.setFollowings,
        following_leaves: members.inviteForm.delFollowing,
        following_enters: members.inviteForm.addFollowing,
        crowd(d) {
            members.setSpectators(d.users);
        },
        error(msg) {
            alert(msg);
        }
    };
    return {
        data,
        form,
        members,
        chapters,
        notif,
        commentForm,
        glyphForm,
        serverEval,
        share,
        tags,
        studyDesc,
        chapterDesc,
        vm,
        relay,
        multiBoard,
        isUpdatedRecently() {
            return Date.now() - vm.updatedAt < 300 * 1000;
        },
        toggleLike() {
            data.liked = !data.liked;
            redraw();
            likeToggler();
        },
        position() {
            return data.position;
        },
        currentChapter,
        isChapterOwner,
        canJumpTo(path) {
            if (gamebookPlay)
                return gamebookPlay.canJumpTo(path);
            return data.chapter.conceal === undefined ||
                isChapterOwner() ||
                tree_1.path.contains(ctrl.path, path) || // can always go back
                ctrl.tree.lastMainlineNode(path).ply <= data.chapter.conceal;
        },
        onJump() {
            if (gamebookPlay)
                gamebookPlay.onJump();
            else
                chapters.localPaths[vm.chapterId] = ctrl.path; // don't remember position on gamebook
            if (practice)
                practice.onJump();
        },
        withPosition,
        setPath(path, node, playedMyself) {
            onSetPath(path);
            commentForm.onSetPath(vm.chapterId, path, node, playedMyself);
        },
        deleteNode(path) {
            makeChange("deleteNode", addChapterId({
                path,
                jumpTo: ctrl.path
            }));
        },
        promote(path, toMainline) {
            makeChange("promote", addChapterId({
                toMainline,
                path
            }));
        },
        forceVariation(path, force) {
            makeChange("forceVariation", addChapterId({
                force,
                path
            }));
        },
        setChapter(id, force) {
            const alreadySet = id === vm.chapterId && !force;
            if (relay && relay.intro.active) {
                relay.intro.disable();
                if (alreadySet)
                    redraw();
            }
            if (alreadySet)
                return;
            if (!vm.mode.sticky || !makeChange("setChapter", id)) {
                vm.mode.sticky = false;
                if (!vm.behind)
                    vm.behind = 1;
                vm.chapterId = id;
                xhrReload();
            }
            vm.loading = true;
            vm.nextChapterId = id;
            vm.justSetChapterId = id;
            redraw();
        },
        toggleSticky() {
            vm.mode.sticky = !vm.mode.sticky && data.features.sticky;
            xhrReload();
        },
        toggleWrite() {
            vm.mode.write = !vm.mode.write && members.canContribute();
            xhrReload();
        },
        isWriting,
        makeChange,
        startTour,
        userJump: ctrl.userJump,
        currentNode,
        practice,
        gamebookPlay: () => gamebookPlay,
        nextChapter() {
            const chapters = data.chapters, currentId = currentChapter().id;
            for (let i in chapters)
                if (chapters[i].id === currentId)
                    return chapters[parseInt(i) + 1];
        },
        setGamebookOverride(o) {
            vm.gamebookOverride = o;
            instanciateGamebookPlay();
            configureAnalysis();
            ctrl.userJump(ctrl.path);
            if (!o)
                xhrReload();
        },
        mutateCgConfig,
        explorerGame(gameId, insert) {
            makeChange('explorerGame', withPosition({ gameId, insert }));
        },
        onPremoveSet() {
            if (gamebookPlay)
                gamebookPlay.onPremoveSet();
        },
        redraw,
        trans: ctrl.trans,
        socketHandler: (t, d) => {
            const handler = socketHandlers[t];
            if (handler) {
                handler(d);
                return true;
            }
            return !!relay && relay.socketHandler(t, d);
        },
    };
}
exports.default = default_1;
;

},{"./commentForm":77,"./description":78,"./gamebook/gamebookPlayCtrl":81,"./multiBoard":84,"./notif":85,"./practice/studyPracticeCtrl":88,"./relay/relayCtrl":91,"./serverEval":94,"./studyChapters":95,"./studyForm":98,"./studyGlyph":99,"./studyMembers":100,"./studyShare":101,"./studyTags":102,"./studyTour":103,"./studyXhr":105,"common":131,"common/throttle":137,"tree":142}],98:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const modal = require("../modal");
const common_1 = require("common");
const util_1 = require("../util");
function select(s) {
    return [
        snabbdom_1.h('label.form-label', {
            attrs: { for: 'study-' + s.key }
        }, s.name),
        snabbdom_1.h(`select#study-${s.key}.form-control`, s.choices.map(function (o) {
            return snabbdom_1.h('option', {
                attrs: {
                    value: o[0],
                    selected: s.selected === o[0]
                }
            }, o[1]);
        }))
    ];
}
;
function ctrl(save, getData, trans, redraw, relay) {
    const initAt = Date.now();
    function isNew() {
        const d = getData();
        return d.from === 'scratch' && !!d.isNew && Date.now() - initAt < 9000;
    }
    const open = common_1.prop(false);
    return {
        open,
        openIfNew() {
            if (isNew())
                open(true);
        },
        save(data, isNew) {
            save(data, isNew);
            open(false);
        },
        getData,
        isNew,
        trans,
        redraw,
        relay
    };
}
exports.ctrl = ctrl;
function view(ctrl) {
    const data = ctrl.getData();
    const isNew = ctrl.isNew();
    const updateName = function (vnode, isUpdate) {
        const el = vnode.elm;
        if (!isUpdate && !el.value) {
            el.value = data.name;
            if (isNew)
                el.select();
            el.focus();
        }
    };
    const userSelectionChoices = [
        ['nobody', ctrl.trans.noarg('nobody')],
        ['owner', ctrl.trans.noarg('onlyMe')],
        ['contributor', ctrl.trans.noarg('contributors')],
        ['member', ctrl.trans.noarg('members')],
        ['everyone', ctrl.trans.noarg('everyone')]
    ];
    return modal.modal({
        class: 'study-edit',
        onClose: function () {
            ctrl.open(false);
            ctrl.redraw();
        },
        content: [
            snabbdom_1.h('h2', ctrl.trans.noarg(ctrl.relay ? 'configureLiveBroadcast' : (isNew ? 'createStudy' : 'editStudy'))),
            snabbdom_1.h('form.form3', {
                hook: util_1.bindSubmit(e => {
                    const obj = {};
                    'name visibility computer explorer cloneable chat sticky description'.split(' ').forEach(n => {
                        const el = e.target.querySelector('#study-' + n);
                        if (el)
                            obj[n] = el.value;
                    });
                    ctrl.save(obj, isNew);
                }, ctrl.redraw)
            }, [
                snabbdom_1.h('div.form-group' + (ctrl.relay ? '.none' : ''), [
                    snabbdom_1.h('label.form-label', { attrs: { 'for': 'study-name' } }, ctrl.trans.noarg('name')),
                    snabbdom_1.h('input#study-name.form-control', {
                        attrs: {
                            minlength: 3,
                            maxlength: 100
                        },
                        hook: {
                            insert: vnode => updateName(vnode, false),
                            postpatch: (_, vnode) => updateName(vnode, true)
                        }
                    })
                ]),
                snabbdom_1.h('div.form-split', [
                    snabbdom_1.h('div.form-group.form-half', select({
                        key: 'visibility',
                        name: ctrl.trans.noarg('visibility'),
                        choices: [
                            ['public', ctrl.trans.noarg('public')],
                            ['unlisted', ctrl.trans.noarg('unlisted')],
                            ['private', ctrl.trans.noarg('inviteOnly')]
                        ],
                        selected: data.visibility
                    })),
                    snabbdom_1.h('div.form-group.form-half', select({
                        key: 'cloneable',
                        name: ctrl.trans.noarg('allowCloning'),
                        choices: userSelectionChoices,
                        selected: data.settings.cloneable
                    }))
                ]),
                snabbdom_1.h('div.form-split', [
                    snabbdom_1.h('div.form-group.form-half', select({
                        key: 'computer',
                        name: ctrl.trans.noarg('computerAnalysis'),
                        choices: userSelectionChoices.map(c => [c[0], ctrl.trans.noarg(c[1])]),
                        selected: data.settings.computer
                    })),
                    snabbdom_1.h('div.form-group.form-half', select({
                        key: 'explorer',
                        name: ctrl.trans.noarg('openingExplorer'),
                        choices: userSelectionChoices,
                        selected: data.settings.explorer
                    }))
                ]),
                snabbdom_1.h('div.form-split', [
                    snabbdom_1.h('div.form-group.form-half', select({
                        key: 'chat',
                        name: ctrl.trans.noarg('chat'),
                        choices: userSelectionChoices,
                        selected: data.settings.chat
                    })),
                    snabbdom_1.h('div.form-group.form-half', select({
                        key: 'sticky',
                        name: ctrl.trans.noarg('enableSync'),
                        choices: [
                            ['true', ctrl.trans.noarg('yesKeepEveryoneOnTheSamePosition')],
                            ['false', ctrl.trans.noarg('noLetPeopleBrowseFreely')]
                        ],
                        selected: '' + data.settings.sticky
                    }))
                ]),
                snabbdom_1.h('div.form-group.form-half', select({
                    key: 'description',
                    name: ctrl.trans.noarg('pinnedStudyComment'),
                    choices: [
                        ['false', ctrl.trans.noarg('noPinnedComment')],
                        ['true', ctrl.trans.noarg('rightUnderTheBoard')]
                    ],
                    selected: '' + data.settings.description
                })),
                modal.button(ctrl.trans.noarg(isNew ? 'start' : 'save'))
            ]),
            snabbdom_1.h('div.destructive', [
                isNew ? null : snabbdom_1.h('form', {
                    attrs: {
                        action: '/study/' + data.id + '/clear-chat',
                        method: 'post'
                    },
                    hook: util_1.bind('submit', _ => {
                        return confirm(ctrl.trans.noarg('deleteTheStudyChatHistory'));
                    })
                }, [
                    snabbdom_1.h(util_1.emptyRedButton, ctrl.trans.noarg('clearChat'))
                ]),
                snabbdom_1.h('form', {
                    attrs: {
                        action: '/study/' + data.id + '/delete',
                        method: 'post'
                    },
                    hook: util_1.bind('submit', _ => {
                        return isNew || confirm(ctrl.trans.noarg('deleteTheEntireStudy'));
                    })
                }, [
                    snabbdom_1.h(util_1.emptyRedButton, ctrl.trans.noarg(isNew ? 'cancel' : 'deleteStudy'))
                ])
            ])
        ]
    });
}
exports.view = view;

},{"../modal":63,"../util":110,"common":131,"snabbdom":35}],99:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const xhr = require("./studyXhr");
const common_1 = require("common");
const throttle_1 = require("common/throttle");
const util_1 = require("../util");
function renderGlyph(ctrl, node) {
    return function (glyph) {
        return snabbdom_1.h('a', {
            hook: util_1.bind('click', _ => {
                ctrl.toggleGlyph(glyph.id);
                return false;
            }, ctrl.redraw),
            attrs: { 'data-symbol': glyph.symbol },
            class: {
                active: !!node.glyphs && !!node.glyphs.find(g => g.id === glyph.id)
            }
        }, [
            glyph.name
        ]);
    };
}
function ctrl(root) {
    const all = common_1.prop(null);
    function loadGlyphs() {
        if (!all())
            xhr.glyphs().then(gs => {
                all(gs);
                root.redraw();
            });
    }
    ;
    const toggleGlyph = throttle_1.default(500, (id) => {
        root.study.makeChange('toggleGlyph', root.study.withPosition({
            id
        }));
    });
    return {
        root,
        all,
        loadGlyphs,
        toggleGlyph,
        redraw: root.redraw
    };
}
exports.ctrl = ctrl;
function viewDisabled(why) {
    return snabbdom_1.h('div.study__glyphs', [
        snabbdom_1.h('div.study__message', why)
    ]);
}
exports.viewDisabled = viewDisabled;
function view(ctrl) {
    const all = ctrl.all(), node = ctrl.root.node;
    return snabbdom_1.h('div.study__glyphs' + (all ? '' : '.empty'), {
        hook: { insert: ctrl.loadGlyphs }
    }, all ? [
        snabbdom_1.h('div.move', all.move.map(renderGlyph(ctrl, node))),
        snabbdom_1.h('div.position', all.position.map(renderGlyph(ctrl, node))),
        snabbdom_1.h('div.observation', all.observation.map(renderGlyph(ctrl, node)))
    ] : [snabbdom_1.h('div.study__message', util_1.spinner())]);
}
exports.view = view;

},{"../util":110,"./studyXhr":105,"common":131,"common/throttle":137,"snabbdom":35}],100:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const util_1 = require("../util");
const common_1 = require("common");
const inviteForm_1 = require("./inviteForm");
function memberActivity(onIdle) {
    let timeout;
    let schedule = function () {
        if (timeout)
            clearTimeout(timeout);
        timeout = setTimeout(onIdle, 100);
    };
    schedule();
    return schedule;
}
function ctrl(opts) {
    const dict = common_1.prop(opts.initDict);
    const confing = common_1.prop(undefined);
    let active = {};
    let online = {};
    let spectatorIds = [];
    const max = 30;
    function owner() {
        return dict()[opts.ownerId];
    }
    ;
    function isOwner() {
        return opts.myId === opts.ownerId;
    }
    ;
    function myMember() {
        return opts.myId ? dict()[opts.myId] : null;
    }
    ;
    function canContribute() {
        var m = myMember();
        return m && m.role === 'w';
    }
    ;
    const inviteForm = inviteForm_1.ctrl(opts.send, dict, () => opts.tab('members'), opts.redraw, opts.trans);
    function setActive(id) {
        if (opts.tab() !== 'members')
            return;
        if (active[id])
            active[id]();
        else
            active[id] = memberActivity(function () {
                delete (active[id]);
                opts.redraw();
            });
        opts.redraw();
    }
    ;
    function updateOnline() {
        online = {};
        const members = dict();
        spectatorIds.forEach(function (id) {
            if (members[id])
                online[id] = true;
        });
        if (opts.tab() === 'members')
            opts.redraw();
    }
    return {
        dict,
        confing,
        myId: opts.myId,
        inviteForm,
        update(members) {
            if (isOwner())
                confing(Object.keys(members).find(function (sri) {
                    return !dict()[sri];
                }));
            const wasViewer = myMember() && !canContribute();
            const wasContrib = myMember() && canContribute();
            dict(members);
            if (wasViewer && canContribute()) {
                if (window.lichess.once('study-tour'))
                    opts.startTour();
                opts.onBecomingContributor();
                opts.notif.set({
                    text: opts.trans.noarg('youAreNowAContributor'),
                    duration: 3000
                });
            }
            else if (wasContrib && !canContribute())
                opts.notif.set({
                    text: opts.trans.noarg('youAreNowASpectator'),
                    duration: 3000
                });
            updateOnline();
        },
        setActive,
        isActive(id) {
            return !!active[id];
        },
        owner,
        myMember,
        isOwner,
        canContribute,
        max,
        setRole(id, role) {
            setActive(id);
            opts.send("setRole", {
                userId: id,
                role
            });
            confing(undefined);
        },
        kick(id) {
            opts.send("kick", id);
            confing(undefined);
        },
        leave() {
            opts.send("leave");
        },
        ordered() {
            const d = dict();
            return Object.keys(d).map(id => d[id]).sort((a, b) => a.role === 'r' && b.role === 'w' ? 1 : (a.role === 'w' && b.role === 'r' ? -1 : 0));
        },
        size() {
            return Object.keys(dict()).length;
        },
        setSpectators(usernames) {
            const names = usernames || [];
            this.inviteForm.setSpectators(names);
            spectatorIds = names.map(util_1.titleNameToId);
            updateOnline();
        },
        isOnline(userId) {
            return online[userId];
        },
        hasOnlineContributor() {
            const members = dict();
            for (let i in members)
                if (online[i] && members[i].role === 'w')
                    return true;
            return false;
        }
    };
}
exports.ctrl = ctrl;
function view(ctrl) {
    const isOwner = ctrl.members.isOwner();
    function username(member) {
        var u = member.user;
        return snabbdom_1.h('span.user-link.ulpt', {
            attrs: { 'data-href': '/@/' + u.name }
        }, (u.title ? u.title + ' ' : '') + u.name);
    }
    ;
    function statusIcon(member) {
        const contrib = member.role === 'w';
        return snabbdom_1.h('span.status', {
            class: {
                contrib,
                active: ctrl.members.isActive(member.user.id),
                online: ctrl.members.isOnline(member.user.id)
            },
            attrs: { title: ctrl.trans.noarg(contrib ? 'contributor' : 'spectator') },
        }, [
            util_1.iconTag(contrib ? 'r' : 'v')
        ]);
    }
    ;
    function configButton(ctrl, member) {
        if (isOwner && member.user.id !== ctrl.members.myId)
            return snabbdom_1.h('act', {
                key: 'cfg-' + member.user.id,
                attrs: util_1.dataIcon('%'),
                hook: util_1.bind('click', _ => {
                    ctrl.members.confing(ctrl.members.confing() === member.user.id ? null : member.user.id);
                }, ctrl.redraw)
            });
        if (!isOwner && member.user.id === ctrl.members.myId)
            return snabbdom_1.h('act.leave', {
                key: 'leave',
                attrs: {
                    'data-icon': 'F',
                    title: ctrl.trans.noarg('leaveTheStudy')
                },
                hook: util_1.bind('click', ctrl.members.leave, ctrl.redraw)
            });
    }
    ;
    function memberConfig(member) {
        const roleId = 'member-role';
        return snabbdom_1.h('m-config', {
            key: member.user.id + '-config',
            hook: util_1.onInsert(el => util_1.scrollTo($(el).parent('.members')[0], el))
        }, [
            snabbdom_1.h('div.role', [
                snabbdom_1.h('div.switch', [
                    snabbdom_1.h('input.cmn-toggle', {
                        attrs: {
                            id: roleId,
                            type: 'checkbox',
                            checked: member.role === 'w'
                        },
                        hook: util_1.bind('change', e => {
                            ctrl.members.setRole(member.user.id, e.target.checked ? 'w' : 'r');
                        }, ctrl.redraw)
                    }),
                    snabbdom_1.h('label', { attrs: { 'for': roleId } })
                ]),
                snabbdom_1.h('label', { attrs: { 'for': roleId } }, ctrl.trans.noarg('contributor'))
            ]),
            snabbdom_1.h('div.kick', snabbdom_1.h('a.button.button-red.button-empty.text', {
                attrs: util_1.dataIcon('L'),
                hook: util_1.bind('click', _ => ctrl.members.kick(member.user.id), ctrl.redraw)
            }, ctrl.trans.noarg('kick')))
        ]);
    }
    ;
    var ordered = ctrl.members.ordered();
    return snabbdom_1.h('div.study__members', {
        hook: {
            insert: _ => {
                window.lichess.pubsub.emit('content_loaded');
                window.lichess.pubsub.emit('chat.resize');
            }
        }
    }, [
        ...ordered.map(function (member) {
            const confing = ctrl.members.confing() === member.user.id;
            return [
                snabbdom_1.h('div', {
                    key: member.user.id,
                    class: { editing: !!confing }
                }, [
                    snabbdom_1.h('div.left', [
                        statusIcon(member),
                        username(member)
                    ]),
                    configButton(ctrl, member)
                ]),
                confing ? memberConfig(member) : null
            ];
        }).reduce((a, b) => a.concat(b), []),
        (isOwner && ordered.length < ctrl.members.max) ? snabbdom_1.h('div.add', {
            key: 'add',
            hook: util_1.bind('click', ctrl.members.inviteForm.toggle, ctrl.redraw)
        }, [
            snabbdom_1.h('div.left', [
                snabbdom_1.h('span.status', util_1.iconTag('O')),
                snabbdom_1.h('div.user-link', ctrl.trans.noarg('addMembers'))
            ])
        ]) : null
    ]);
}
exports.view = view;

},{"../util":110,"./inviteForm":83,"common":131,"snabbdom":35}],101:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const util_1 = require("../util");
const common_1 = require("common");
const moveView_1 = require("../moveView");
function fromPly(ctrl) {
    const renderedMove = moveView_1.renderIndexAndMove({
        withDots: true,
        showEval: false
    }, ctrl.currentNode());
    return snabbdom_1.h('div.ply-wrap', snabbdom_1.h('label.ply', [
        snabbdom_1.h('input', {
            attrs: { type: 'checkbox' },
            hook: util_1.bind('change', e => {
                ctrl.withPly(e.target.checked);
            }, ctrl.redraw)
        }),
        ...(renderedMove ?
            ctrl.trans.vdom('startAtX', snabbdom_1.h('strong', renderedMove)) :
            [ctrl.trans.noarg('startAtInitialPosition')])
    ]));
}
function ctrl(data, currentChapter, currentNode, redraw, trans) {
    const withPly = common_1.prop(false);
    return {
        studyId: data.id,
        chapter: currentChapter,
        isPrivate() {
            return data.visibility === 'private';
        },
        currentNode,
        withPly,
        cloneable: data.features.cloneable,
        redraw,
        trans
    };
}
exports.ctrl = ctrl;
function view(ctrl) {
    const studyId = ctrl.studyId, chapter = ctrl.chapter();
    let fullUrl = `${util_1.baseUrl()}/study/${studyId}/${chapter.id}`;
    let embedUrl = `${util_1.baseUrl()}/study/embed/${studyId}/${chapter.id}`;
    const isPrivate = ctrl.isPrivate();
    if (ctrl.withPly()) {
        const p = ctrl.currentNode().ply;
        fullUrl += '#' + p;
        embedUrl += '#' + p;
    }
    return snabbdom_1.h('div.study__share', [
        snabbdom_1.h('div.downloads', [
            ctrl.cloneable ? snabbdom_1.h('a.button.text', {
                attrs: {
                    'data-icon': '4',
                    href: '/study/' + studyId + '/clone'
                }
            }, ctrl.trans.noarg('cloneStudy')) : null,
            snabbdom_1.h('a.button.text', {
                attrs: {
                    'data-icon': 'x',
                    href: '/study/' + studyId + '.pgn'
                }
            }, ctrl.trans.noarg('studyPgn')),
            snabbdom_1.h('a.button.text', {
                attrs: {
                    'data-icon': 'x',
                    href: '/study/' + studyId + '/' + chapter.id + '.pgn'
                }
            }, ctrl.trans.noarg('chapterPgn'))
        ]),
        snabbdom_1.h('form.form3', [
            snabbdom_1.h('div.form-group', [
                snabbdom_1.h('label.form-label', ctrl.trans.noarg('studyUrl')),
                snabbdom_1.h('input.form-control.autoselect', {
                    attrs: {
                        readonly: true,
                        value: `${util_1.baseUrl()}/study/${studyId}`
                    }
                })
            ]),
            snabbdom_1.h('div.form-group', [
                snabbdom_1.h('label.form-label', ctrl.trans.noarg('currentChapterUrl')),
                snabbdom_1.h('input.form-control.autoselect', {
                    attrs: {
                        readonly: true,
                        value: fullUrl
                    }
                }),
                fromPly(ctrl),
                !isPrivate ? snabbdom_1.h('p.form-help.text', {
                    attrs: { 'data-icon': '' }
                }, ctrl.trans.noarg('youCanPasteThisInTheForumToEmbedTheChapter')) : null,
            ]),
            snabbdom_1.h('div.form-group', [
                snabbdom_1.h('label.form-label', ctrl.trans.noarg('embedThisChapter')),
                snabbdom_1.h('input.form-control.autoselect', {
                    attrs: {
                        readonly: true,
                        disabled: isPrivate,
                        value: !isPrivate ? '<iframe width=600 height=371 src="' + embedUrl + '" frameborder=0></iframe>' : ctrl.trans.noarg('onlyPublicStudiesCanBeEmbedded')
                    }
                })
            ].concat(!isPrivate ? [
                fromPly(ctrl),
                snabbdom_1.h('a.form-help.text', {
                    attrs: {
                        href: '/developers#embed-study',
                        target: '_blank',
                        'data-icon': ''
                    }
                }, ctrl.trans.noarg('readMoreAboutEmbeddingAStudyChapter'))
            ] : [])),
            snabbdom_1.h('div.form-group', [
                snabbdom_1.h('label.form-label', 'FEN'),
                snabbdom_1.h('input.form-control.autoselect', {
                    attrs: {
                        readonly: true,
                        value: ctrl.currentNode().fen
                    },
                })
            ])
        ])
    ]);
}
exports.view = view;

},{"../moveView":64,"../util":110,"common":131,"snabbdom":35}],102:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const throttle_1 = require("common/throttle");
const util_1 = require("../util");
function editable(value, submit) {
    return snabbdom_1.h('input', {
        key: value,
        attrs: {
            spellcheck: false,
            value
        },
        hook: util_1.onInsert(el => {
            el.onblur = function () {
                submit(el.value, el);
            };
            el.onkeypress = function (e) {
                if ((e.keyCode || e.which) == 13)
                    el.blur();
            };
        })
    });
}
function fixed(text) {
    return snabbdom_1.h('span', text);
}
let selectedType;
function renderPgnTags(chapter, submit, types, trans) {
    let rows = [];
    if (chapter.setup.variant.key !== 'standard')
        rows.push(['Variant', fixed(chapter.setup.variant.name)]);
    rows = rows.concat(chapter.tags.map(tag => [
        tag[0],
        submit ? editable(tag[1], submit(tag[0])) : fixed(tag[1])
    ]));
    if (submit) {
        const existingTypes = chapter.tags.map(t => t[0]);
        rows.push([
            snabbdom_1.h('select', {
                hook: {
                    insert: vnode => {
                        const el = vnode.elm;
                        selectedType = el.value;
                        el.addEventListener('change', _ => {
                            selectedType = el.value;
                            $(el).parents('tr').find('input').focus();
                        });
                    },
                    postpatch: (_, vnode) => {
                        selectedType = vnode.elm.value;
                    }
                }
            }, [
                snabbdom_1.h('option', trans.noarg('newTag')),
                ...types.map(t => {
                    if (!existingTypes.includes(t))
                        return util_1.option(t, '', t);
                })
            ]),
            editable('', (value, el) => {
                if (selectedType) {
                    submit(selectedType)(value);
                    el.value = '';
                }
            })
        ]);
    }
    return snabbdom_1.h('table.study__tags.slist', snabbdom_1.h('tbody', rows.map(function (r) {
        return snabbdom_1.h('tr', {
            key: '' + r[0]
        }, [
            snabbdom_1.h('th', [r[0]]),
            snabbdom_1.h('td', [r[1]])
        ]);
    })));
}
function ctrl(root, getChapter, types) {
    const submit = throttle_1.default(500, function (name, value) {
        root.study.makeChange('setTag', {
            chapterId: getChapter().id,
            name,
            value: value.substr(0, 140)
        });
    });
    return {
        submit(name) {
            return value => submit(name, value);
        },
        getChapter,
        types
    };
}
exports.ctrl = ctrl;
function doRender(root) {
    return snabbdom_1.h('div', renderPgnTags(root.tags.getChapter(), root.vm.mode.write && root.tags.submit, root.tags.types, root.trans));
}
function view(root) {
    const chapter = root.tags.getChapter(), tagKey = chapter.tags.map(t => t[1]).join(','), key = chapter.id + root.data.name + chapter.name + root.data.likes + tagKey + root.vm.mode.write;
    return snabbdom_1.thunk('div.' + chapter.id, doRender, [root, key]);
}
exports.view = view;

},{"../util":110,"common/throttle":137,"snabbdom":35}],103:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function study(ctrl) {
    window.lichess.loadScript('javascripts/study/tour.js').then(() => {
        window.lichess['studyTour']({
            userId: ctrl.opts.userId,
            isContrib: ctrl.study.members.canContribute(),
            isOwner: ctrl.study.members.isOwner(),
            setTab: (tab) => {
                ctrl.study.vm.tab(tab);
                ctrl.redraw();
            }
        });
    });
}
exports.study = study;
function chapter(setTab) {
    window.lichess.loadScript('javascripts/study/tour-chapter.js').then(() => {
        window.lichess['studyTourChapter']({
            setTab
        });
    });
}
exports.chapter = chapter;

},{}],104:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const util_1 = require("../util");
const studyMembers_1 = require("./studyMembers");
const studyChapters_1 = require("./studyChapters");
const chapterNewForm_1 = require("./chapterNewForm");
const chapterEditForm_1 = require("./chapterEditForm");
const commentForm = require("./commentForm");
const glyphForm = require("./studyGlyph");
const inviteForm_1 = require("./inviteForm");
const studyForm_1 = require("./studyForm");
const studyShare_1 = require("./studyShare");
const multiBoard_1 = require("./multiBoard");
const notif_1 = require("./notif");
const studyTags_1 = require("./studyTags");
const serverEval_1 = require("./serverEval");
const practiceView = require("./practice/studyPracticeView");
const gamebookButtons_1 = require("./gamebook/gamebookButtons");
const description_1 = require("./description");
function toolButton(opts) {
    return snabbdom_1.h('span.' + opts.tab, {
        attrs: { title: opts.hint },
        class: { active: opts.tab === opts.ctrl.vm.toolTab() },
        hook: util_1.bind('mousedown', () => {
            if (opts.onClick)
                opts.onClick();
            opts.ctrl.vm.toolTab(opts.tab);
        }, opts.ctrl.redraw)
    }, [
        opts.count ? snabbdom_1.h('count.data-count', { attrs: { 'data-count': opts.count } }) : null,
        opts.icon
    ]);
}
function buttons(root) {
    const ctrl = root.study, canContribute = ctrl.members.canContribute(), showSticky = ctrl.data.features.sticky && (canContribute || (ctrl.vm.behind && ctrl.isUpdatedRecently())), noarg = root.trans.noarg;
    return snabbdom_1.h('div.study__buttons', [
        snabbdom_1.h('div.left-buttons.tabs-horiz', [
            // distinct classes (sync, write) allow snabbdom to differentiate buttons
            showSticky ? snabbdom_1.h('a.mode.sync', {
                attrs: { title: noarg('allSyncMembersRemainOnTheSamePosition') },
                class: { on: ctrl.vm.mode.sticky },
                hook: util_1.bind('click', ctrl.toggleSticky)
            }, [
                ctrl.vm.behind ? snabbdom_1.h('span.behind', '' + ctrl.vm.behind) : snabbdom_1.h('i.is'),
                'SYNC'
            ]) : null,
            ctrl.members.canContribute() ? snabbdom_1.h('a.mode.write', {
                attrs: { title: noarg('shareChanges') },
                class: { on: ctrl.vm.mode.write },
                hook: util_1.bind('click', ctrl.toggleWrite)
            }, [snabbdom_1.h('i.is'), 'REC']) : null,
            toolButton({
                ctrl,
                tab: 'tags',
                hint: noarg('pgnTags'),
                icon: util_1.iconTag('o'),
            }),
            toolButton({
                ctrl,
                tab: 'comments',
                hint: noarg('commentThisPosition'),
                icon: util_1.iconTag('c'),
                onClick() {
                    ctrl.commentForm.start(ctrl.vm.chapterId, root.path, root.node);
                },
                count: (root.node.comments || []).length
            }),
            canContribute ? toolButton({
                ctrl,
                tab: 'glyphs',
                hint: noarg('annotateWithGlyphs'),
                icon: snabbdom_1.h('i.glyph-icon'),
                count: (root.node.glyphs || []).length
            }) : null,
            toolButton({
                ctrl,
                tab: 'serverEval',
                hint: noarg('computerAnalysis'),
                icon: util_1.iconTag(''),
                count: root.data.analysis && '✓'
            }),
            toolButton({
                ctrl,
                tab: 'multiBoard',
                hint: 'Multiboard',
                icon: util_1.iconTag('')
            }),
            toolButton({
                ctrl,
                tab: 'share',
                hint: noarg('shareAndExport'),
                icon: util_1.iconTag('$')
            }),
            snabbdom_1.h('span.help', {
                attrs: { title: 'Need help? Get the tour!', 'data-icon': '' },
                hook: util_1.bind('click', ctrl.startTour)
            })
        ]),
        snabbdom_1.h('div.right', [
            gamebookButtons_1.overrideButton(ctrl)
        ])
    ]);
}
function metadata(ctrl) {
    const d = ctrl.data, credit = ctrl.relay && ctrl.relay.data.credit;
    return snabbdom_1.h('div.study__metadata', [
        snabbdom_1.h('h2', [
            snabbdom_1.h('span.name', [
                d.name,
                ': ' + ctrl.currentChapter().name,
                credit ? snabbdom_1.h('span.credit', { hook: util_1.richHTML(credit, false) }) : undefined
            ]),
            snabbdom_1.h('span.liking.text', {
                class: { liked: d.liked },
                attrs: {
                    'data-icon': d.liked ? '' : '',
                    title: ctrl.trans.noarg('like')
                },
                hook: util_1.bind('click', ctrl.toggleLike)
            }, '' + d.likes)
        ]),
        studyTags_1.view(ctrl)
    ]);
}
function side(ctrl) {
    const activeTab = ctrl.vm.tab(), intro = ctrl.relay && ctrl.relay.intro;
    const makeTab = function (key, name) {
        return snabbdom_1.h('span.' + key, {
            class: { active: (!intro || !intro.active) && activeTab === key },
            hook: util_1.bind('mousedown', () => {
                if (intro)
                    intro.disable();
                ctrl.vm.tab(key);
            }, ctrl.redraw)
        }, name);
    };
    const introTab = intro && intro.exists ? snabbdom_1.h('span.intro', {
        class: { active: intro.active },
        hook: util_1.bind('mousedown', () => { intro.active = true; }, ctrl.redraw)
    }, [util_1.iconTag('')]) : null;
    const tabs = snabbdom_1.h('div.tabs-horiz', [
        introTab,
        makeTab('chapters', ctrl.trans.plural(ctrl.relay ? 'nbGames' : 'nbChapters', ctrl.chapters.size())),
        makeTab('members', ctrl.trans.plural('nbMembers', ctrl.members.size())),
        ctrl.members.isOwner() ? snabbdom_1.h('span.more', {
            hook: util_1.bind('click', () => ctrl.form.open(!ctrl.form.open()), ctrl.redraw)
        }, [util_1.iconTag('[')]) : null
    ]);
    return snabbdom_1.h('div.study__side', [
        tabs,
        (activeTab === 'members' ? studyMembers_1.view : studyChapters_1.view)(ctrl)
    ]);
}
exports.side = side;
function contextMenu(ctrl, path, node) {
    return ctrl.vm.mode.write ? [
        snabbdom_1.h('a', {
            attrs: util_1.dataIcon('c'),
            hook: util_1.bind('click', () => {
                ctrl.vm.toolTab('comments');
                ctrl.commentForm.start(ctrl.currentChapter().id, path, node);
            })
        }, ctrl.trans.noarg('commentThisMove')),
        snabbdom_1.h('a.glyph-icon', {
            hook: util_1.bind('click', () => {
                ctrl.vm.toolTab('glyphs');
                ctrl.userJump(path);
            })
        }, ctrl.trans.noarg('annotateWithGlyphs'))
    ] : [];
}
exports.contextMenu = contextMenu;
function overboard(ctrl) {
    if (ctrl.chapters.newForm.vm.open)
        return chapterNewForm_1.view(ctrl.chapters.newForm);
    if (ctrl.chapters.editForm.current())
        return chapterEditForm_1.view(ctrl.chapters.editForm);
    if (ctrl.members.inviteForm.open())
        return inviteForm_1.view(ctrl.members.inviteForm);
    if (ctrl.form.open())
        return studyForm_1.view(ctrl.form);
}
exports.overboard = overboard;
function underboard(ctrl) {
    if (ctrl.embed)
        return [];
    if (ctrl.studyPractice)
        return practiceView.underboard(ctrl.study);
    const study = ctrl.study, toolTab = study.vm.toolTab();
    if (study.gamebookPlay())
        return [
            gamebookButtons_1.playButtons(ctrl),
            description_1.view(study, true),
            description_1.view(study, false),
            metadata(study)
        ];
    let panel;
    switch (toolTab) {
        case 'tags':
            panel = metadata(study);
            break;
        case 'comments':
            panel = study.vm.mode.write ?
                commentForm.view(ctrl) : (commentForm.viewDisabled(ctrl, study.members.canContribute() ?
                'Press REC to comment moves' :
                'Only the study members can comment on moves'));
            break;
        case 'glyphs':
            panel = ctrl.path ? (study.vm.mode.write ?
                glyphForm.view(study.glyphForm) :
                glyphForm.viewDisabled('Press REC to annotate moves')) : glyphForm.viewDisabled('Select a move to annotate');
            break;
        case 'serverEval':
            panel = serverEval_1.view(study.serverEval);
            break;
        case 'share':
            panel = studyShare_1.view(study.share);
            break;
        case 'multiBoard':
            panel = multiBoard_1.view(study.multiBoard, study);
            break;
    }
    return [
        notif_1.view(study.notif),
        description_1.view(study, true),
        description_1.view(study, false),
        buttons(ctrl),
        panel
    ];
}
exports.underboard = underboard;

},{"../util":110,"./chapterEditForm":75,"./chapterNewForm":76,"./commentForm":77,"./description":78,"./gamebook/gamebookButtons":79,"./inviteForm":83,"./multiBoard":84,"./notif":85,"./practice/studyPracticeView":90,"./serverEval":94,"./studyChapters":95,"./studyForm":98,"./studyGlyph":99,"./studyMembers":100,"./studyShare":101,"./studyTags":102,"snabbdom":35}],105:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const headers = {
    'Accept': 'application/vnd.lichess.v3+json'
};
function reload(baseUrl, id, chapterId) {
    let url = '/' + baseUrl + '/' + id;
    if (chapterId)
        url += '/' + chapterId;
    return $.ajax({
        url,
        headers
    });
}
exports.reload = reload;
function variants() {
    return $.ajax({
        url: '/variant',
        headers,
        cache: true
    });
}
exports.variants = variants;
function glyphs() {
    return $.ajax({
        url: window.lichess.assetUrl('glyphs.json', { noVersion: true }),
        headers,
        cache: true
    });
}
exports.glyphs = glyphs;
function chapterConfig(studyId, chapterId) {
    return $.ajax({
        url: `/study/${studyId}/${chapterId}/meta`,
        headers
    });
}
exports.chapterConfig = chapterConfig;
function practiceComplete(chapterId, nbMoves) {
    return $.ajax({
        method: 'POST',
        url: `/practice/complete/${chapterId}/${nbMoves}`,
        headers
    });
}
exports.practiceComplete = practiceComplete;
function importPgn(studyId, data) {
    return $.ajax({
        method: 'POST',
        url: `/study/${studyId}/import-pgn?sri=${window.lichess.sri}`,
        data: data,
        headers
    });
}
exports.importPgn = importPgn;
function multiBoard(studyId, page, playing) {
    return $.ajax({
        url: `/study/${studyId}/multi-board?page=${page}&playing=${playing}`,
        headers
    });
}
exports.multiBoard = multiBoard;

},{}],106:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const common_1 = require("common");
const chess_1 = require("chess");
const tree_1 = require("tree");
const moveView = require("../moveView");
const studyComments_1 = require("../study/studyComments");
const treeView_1 = require("./treeView");
const util_1 = require("../util");
function emptyMove(conceal) {
    const c = {};
    if (conceal)
        c[conceal] = true;
    return snabbdom_1.h('move.empty', {
        class: c
    }, '...');
}
function renderChildrenOf(ctx, node, opts) {
    const cs = node.children, main = cs[0];
    if (!main)
        return;
    const conceal = opts.noConceal ? null : (opts.conceal || ctx.concealOf(true)(opts.parentPath + main.id, main));
    if (conceal === 'hide')
        return;
    if (opts.isMainline) {
        const isWhite = main.ply % 2 === 1, commentTags = renderMainlineCommentsOf(ctx, main, conceal, true).filter(treeView_1.nonEmpty);
        if (!cs[1] && common_1.empty(commentTags) && !main.forceVariation)
            return (isWhite ? [moveView.renderIndex(main.ply, false)] : []).concat(renderMoveAndChildrenOf(ctx, main, {
                parentPath: opts.parentPath,
                isMainline: true,
                conceal
            }) || []);
        const mainChildren = main.forceVariation ? undefined : renderChildrenOf(ctx, main, {
            parentPath: opts.parentPath + main.id,
            isMainline: true,
            conceal
        });
        const passOpts = {
            parentPath: opts.parentPath,
            isMainline: !main.forceVariation,
            conceal
        };
        return (isWhite ? [moveView.renderIndex(main.ply, false)] : []).concat(main.forceVariation ? [] : [
            renderMoveOf(ctx, main, passOpts),
            isWhite ? emptyMove(passOpts.conceal) : null
        ]).concat([
            snabbdom_1.h('interrupt', commentTags.concat(renderLines(ctx, main.forceVariation ? cs : cs.slice(1), {
                parentPath: opts.parentPath,
                isMainline: passOpts.isMainline,
                conceal,
                noConceal: !conceal
            })))
        ]).concat(isWhite && mainChildren ? [
            moveView.renderIndex(main.ply, false),
            emptyMove(passOpts.conceal)
        ] : []).concat(mainChildren || []);
    }
    if (!cs[1])
        return renderMoveAndChildrenOf(ctx, main, opts);
    return renderInlined(ctx, cs, opts) || [renderLines(ctx, cs, opts)];
}
function renderInlined(ctx, nodes, opts) {
    // only 2 branches
    if (!nodes[1] || nodes[2])
        return;
    // only if second branch has no sub-branches
    if (tree_1.ops.hasBranching(nodes[1], 6))
        return;
    return renderMoveAndChildrenOf(ctx, nodes[0], {
        parentPath: opts.parentPath,
        isMainline: false,
        noConceal: opts.noConceal,
        inline: nodes[1]
    });
}
function renderLines(ctx, nodes, opts) {
    return snabbdom_1.h('lines', {
        class: { single: !nodes[1] }
    }, nodes.map(n => {
        return treeView_1.retroLine(ctx, n, opts) || snabbdom_1.h('line', renderMoveAndChildrenOf(ctx, n, {
            parentPath: opts.parentPath,
            isMainline: false,
            withIndex: true,
            noConceal: opts.noConceal,
            truncate: n.comp && !tree_1.path.contains(ctx.ctrl.path, opts.parentPath + n.id) ? 3 : undefined
        }));
    }));
}
function renderMoveOf(ctx, node, opts) {
    return opts.isMainline ? renderMainlineMoveOf(ctx, node, opts) : renderVariationMoveOf(ctx, node, opts);
}
function renderMainlineMoveOf(ctx, node, opts) {
    const path = opts.parentPath + node.id, classes = treeView_1.nodeClasses(ctx, path);
    if (opts.conceal)
        classes[opts.conceal] = true;
    return snabbdom_1.h('move', {
        attrs: { p: path },
        class: classes
    }, moveView.renderMove(ctx, node));
}
function renderVariationMoveOf(ctx, node, opts) {
    const withIndex = opts.withIndex || node.ply % 2 === 1, path = opts.parentPath + node.id, content = [
        withIndex ? moveView.renderIndex(node.ply, true) : null,
        chess_1.fixCrazySan(node.san)
    ], classes = treeView_1.nodeClasses(ctx, path);
    if (opts.conceal)
        classes[opts.conceal] = true;
    if (node.glyphs)
        moveView.renderGlyphs(node.glyphs).forEach(g => content.push(g));
    return snabbdom_1.h('move', {
        attrs: { p: path },
        class: classes
    }, content);
}
function renderMoveAndChildrenOf(ctx, node, opts) {
    const path = opts.parentPath + node.id;
    if (opts.truncate === 0)
        return [
            snabbdom_1.h('move', {
                attrs: { p: path }
            }, [snabbdom_1.h('index', '[...]')])
        ];
    return [renderMoveOf(ctx, node, opts)]
        .concat(treeView_1.renderInlineCommentsOf(ctx, node))
        .concat(opts.inline ? renderInline(ctx, opts.inline, opts) : null)
        .concat(renderChildrenOf(ctx, node, {
        parentPath: path,
        isMainline: opts.isMainline,
        noConceal: opts.noConceal,
        truncate: opts.truncate ? opts.truncate - 1 : undefined
    }) || []);
}
function renderInline(ctx, node, opts) {
    return snabbdom_1.h('inline', renderMoveAndChildrenOf(ctx, node, {
        withIndex: true,
        parentPath: opts.parentPath,
        isMainline: false,
        noConceal: opts.noConceal,
        truncate: opts.truncate
    }));
}
function renderMainlineCommentsOf(ctx, node, conceal, withColor) {
    if (!ctx.ctrl.showComments || common_1.empty(node.comments))
        return [];
    const colorClass = withColor ? (node.ply % 2 === 0 ? '.black ' : '.white ') : '';
    return node.comments.map(comment => {
        if (comment.by === 'lichess' && !ctx.showComputer)
            return;
        let sel = 'comment' + colorClass;
        if (comment.text.startsWith('Inaccuracy.'))
            sel += '.inaccuracy';
        else if (comment.text.startsWith('Mistake.'))
            sel += '.mistake';
        else if (comment.text.startsWith('Blunder.'))
            sel += '.blunder';
        if (conceal)
            sel += '.' + conceal;
        const by = node.comments[1] ? `<span class="by">${studyComments_1.authorText(comment.by)}</span>` : '', truncated = treeView_1.truncateComment(comment.text, 400, ctx);
        return snabbdom_1.h(sel, {
            hook: util_1.innerHTML(truncated, text => by + util_1.enrichText(text))
        });
    });
}
const emptyConcealOf = function () {
    return function () { return null; };
};
function default_1(ctrl, concealOf) {
    const root = ctrl.tree.root;
    const ctx = {
        ctrl,
        truncateComments: !ctrl.embed,
        concealOf: concealOf || emptyConcealOf,
        showComputer: ctrl.showComputer() && !ctrl.retro,
        showGlyphs: !!ctrl.study || ctrl.showComputer(),
        showEval: ctrl.showComputer(),
        currentPath: treeView_1.findCurrentPath(ctrl)
    };
    const commentTags = renderMainlineCommentsOf(ctx, root, false, false);
    return snabbdom_1.h('div.tview2.tview2-column', {
        hook: treeView_1.mainHook(ctrl)
    }, [
        common_1.empty(commentTags) ? null : snabbdom_1.h('interrupt', commentTags),
        root.ply & 1 ? moveView.renderIndex(root.ply, false) : null,
        root.ply & 1 ? emptyMove() : null
    ].concat(renderChildrenOf(ctx, root, {
        parentPath: '',
        isMainline: true
    }) || []));
}
exports.default = default_1;

},{"../moveView":64,"../study/studyComments":96,"../util":110,"./treeView":109,"chess":129,"common":131,"snabbdom":35,"tree":142}],107:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const studyView = require("../study/studyView");
const util_1 = require("../util");
const main_1 = require("../main");
const elementId = 'analyse-cm';
function getPosition(e) {
    let posx = 0, posy = 0;
    if (e.pageX || e.pageY) {
        posx = e.pageX;
        posy = e.pageY;
    }
    else if (e.clientX || e.clientY) {
        posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
        posy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
    }
    return {
        x: posx,
        y: posy
    };
}
function positionMenu(menu, coords) {
    const menuWidth = menu.offsetWidth + 4, menuHeight = menu.offsetHeight + 4, windowWidth = window.innerWidth, windowHeight = window.innerHeight;
    menu.style.left = (windowWidth - coords.x) < menuWidth ?
        windowWidth - menuWidth + "px" :
        menu.style.left = coords.x + "px";
    menu.style.top = (windowHeight - coords.y) < menuHeight ?
        windowHeight - menuHeight + "px" :
        menu.style.top = coords.y + "px";
}
function action(icon, text, handler) {
    return snabbdom_1.h('a', {
        attrs: { 'data-icon': icon },
        hook: util_1.bind('click', handler)
    }, text);
}
function view(opts, coords) {
    const ctrl = opts.root, node = ctrl.tree.nodeAtPath(opts.path), onMainline = ctrl.tree.pathIsMainline(opts.path) && !ctrl.tree.pathIsForcedVariation(opts.path), trans = ctrl.trans.noarg;
    return snabbdom_1.h('div#' + elementId + '.visible', {
        hook: {
            insert: vnode => positionMenu(vnode.elm, coords),
            postpatch: (_, vnode) => positionMenu(vnode.elm, coords)
        }
    }, [
        snabbdom_1.h('p.title', util_1.nodeFullName(node)),
        onMainline ? null : action('S', trans('promoteVariation'), () => ctrl.promote(opts.path, false)),
        onMainline ? null : action('E', trans('makeMainLine'), () => ctrl.promote(opts.path, true)),
        action('q', trans('deleteFromHere'), () => ctrl.deleteNode(opts.path))
    ].concat(ctrl.study ? studyView.contextMenu(ctrl.study, opts.path, node) : []).concat([
        onMainline ?
            action('F', trans('forceVariation'), () => ctrl.forceVariation(opts.path, true)) :
            null
    ]));
}
function default_1(e, opts) {
    const el = $('#' + elementId)[0] || $('<div id="' + elementId + '">').appendTo($('body'))[0];
    opts.root.contextMenuPath = opts.path;
    function close(e) {
        if (e.button === 2)
            return; // right click
        opts.root.contextMenuPath = undefined;
        document.removeEventListener('click', close, false);
        $('#' + elementId).removeClass('visible');
        opts.root.redraw();
    }
    ;
    document.addEventListener('click', close, false);
    el.innerHTML = '';
    main_1.patch(el, view(opts, getPosition(e)));
}
exports.default = default_1;

},{"../main":62,"../study/studyView":104,"../util":110,"snabbdom":35}],108:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const chess_1 = require("chess");
const tree_1 = require("tree");
const moveView = require("../moveView");
const treeView_1 = require("./treeView");
function renderChildrenOf(ctx, node, opts) {
    const cs = node.children, main = cs[0];
    if (!main)
        return;
    if (opts.isMainline) {
        if (!cs[1] && !main.forceVariation)
            return renderMoveAndChildrenOf(ctx, main, {
                parentPath: opts.parentPath,
                isMainline: true,
                withIndex: opts.withIndex
            });
        return renderInlined(ctx, cs, opts) || [
            ...(main.forceVariation ? [] : [
                renderMoveOf(ctx, main, {
                    parentPath: opts.parentPath,
                    isMainline: true,
                    withIndex: opts.withIndex
                }),
                ...treeView_1.renderInlineCommentsOf(ctx, main)
            ]),
            snabbdom_1.h('interrupt', renderLines(ctx, main.forceVariation ? cs : cs.slice(1), {
                parentPath: opts.parentPath,
                isMainline: true
            })),
            ...(main.forceVariation ? [] : (renderChildrenOf(ctx, main, {
                parentPath: opts.parentPath + main.id,
                isMainline: true,
                withIndex: true
            }) || []))
        ];
    }
    if (!cs[1])
        return renderMoveAndChildrenOf(ctx, main, opts);
    return renderInlined(ctx, cs, opts) || [renderLines(ctx, cs, opts)];
}
function renderInlined(ctx, nodes, opts) {
    // only 2 branches
    if (!nodes[1] || nodes[2] || nodes[0].forceVariation)
        return;
    // only if second branch has no sub-branches
    if (tree_1.ops.hasBranching(nodes[1], 6))
        return;
    return renderMoveAndChildrenOf(ctx, nodes[0], {
        parentPath: opts.parentPath,
        isMainline: opts.isMainline,
        inline: nodes[1]
    });
}
function renderLines(ctx, nodes, opts) {
    return snabbdom_1.h('lines', nodes.map(n => {
        return treeView_1.retroLine(ctx, n, opts) || snabbdom_1.h('line', renderMoveAndChildrenOf(ctx, n, {
            parentPath: opts.parentPath,
            isMainline: false,
            withIndex: true,
            truncate: n.comp && !tree_1.path.contains(ctx.ctrl.path, opts.parentPath + n.id) ? 3 : undefined
        }));
    }));
}
function renderMoveAndChildrenOf(ctx, node, opts) {
    const path = opts.parentPath + node.id, comments = treeView_1.renderInlineCommentsOf(ctx, node);
    if (opts.truncate === 0)
        return [
            snabbdom_1.h('move', { attrs: { p: path } }, '[...]')
        ];
    return [renderMoveOf(ctx, node, opts)]
        .concat(comments)
        .concat(opts.inline ? renderInline(ctx, opts.inline, opts) : null)
        .concat(renderChildrenOf(ctx, node, {
        parentPath: path,
        isMainline: opts.isMainline,
        truncate: opts.truncate ? opts.truncate - 1 : undefined,
        withIndex: !!comments[0]
    }) || []);
}
function renderInline(ctx, node, opts) {
    return snabbdom_1.h('inline', renderMoveAndChildrenOf(ctx, node, {
        withIndex: true,
        parentPath: opts.parentPath,
        isMainline: false
    }));
}
function renderMoveOf(ctx, node, opts) {
    const path = opts.parentPath + node.id, content = [
        opts.withIndex || node.ply & 1 ? moveView.renderIndex(node.ply, true) : null,
        chess_1.fixCrazySan(node.san)
    ];
    if (node.glyphs)
        moveView.renderGlyphs(node.glyphs).forEach(g => content.push(g));
    return snabbdom_1.h('move', {
        attrs: { p: path },
        class: treeView_1.nodeClasses(ctx, path)
    }, content);
}
function default_1(ctrl) {
    const ctx = {
        ctrl,
        truncateComments: false,
        showComputer: ctrl.showComputer() && !ctrl.retro,
        showGlyphs: !!ctrl.study || ctrl.showComputer(),
        showEval: !!ctrl.study || ctrl.showComputer(),
        currentPath: treeView_1.findCurrentPath(ctrl)
    };
    return snabbdom_1.h('div.tview2.tview2-inline', {
        hook: treeView_1.mainHook(ctrl)
    }, [
        ...treeView_1.renderInlineCommentsOf(ctx, ctrl.tree.root),
        ...(renderChildrenOf(ctx, ctrl.tree.root, {
            parentPath: '',
            isMainline: true
        }) || [])
    ]);
}
exports.default = default_1;

},{"../moveView":64,"./treeView":109,"chess":129,"snabbdom":35,"tree":142}],109:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const game_1 = require("game");
const contextMenu_1 = require("./contextMenu");
const studyComments_1 = require("../study/studyComments");
const util_1 = require("../util");
const tree_1 = require("tree");
const columnView_1 = require("./columnView");
const inlineView_1 = require("./inlineView");
const common_1 = require("common");
const throttle_1 = require("common/throttle");
const storage_1 = require("common/storage");
function ctrl(initialValue = 'column') {
    const value = storage_1.storedProp('treeView', initialValue);
    function inline() {
        return value() === 'inline';
    }
    function set(i) {
        value(i ? 'inline' : 'column');
    }
    return {
        get: value,
        set,
        toggle() {
            set(!inline());
        },
        inline
    };
}
exports.ctrl = ctrl;
// entry point, dispatching to selected view
function render(ctrl, concealOf) {
    return (ctrl.treeView.inline() || window.lichess.isCol1()) ? inlineView_1.default(ctrl) : columnView_1.default(ctrl, concealOf);
}
exports.render = render;
function nodeClasses(ctx, path) {
    return {
        active: path === ctx.ctrl.path,
        'context-menu': path === ctx.ctrl.contextMenuPath,
        current: path === ctx.currentPath,
        nongame: !ctx.currentPath && !!ctx.ctrl.gamePath && tree_1.path.contains(path, ctx.ctrl.gamePath) && path !== ctx.ctrl.gamePath
    };
}
exports.nodeClasses = nodeClasses;
function findCurrentPath(c) {
    return (!c.synthetic && game_1.playable(c.data) && c.initialPath) || (c.retro && c.retro.current() && c.retro.current().prev.path) || (c.study && c.study.data.chapter.relay && c.study.data.chapter.relay.path);
}
exports.findCurrentPath = findCurrentPath;
function renderInlineCommentsOf(ctx, node) {
    if (!ctx.ctrl.showComments || common_1.empty(node.comments))
        return [];
    return node.comments.map(comment => {
        if (comment.by === 'lichess' && !ctx.showComputer)
            return;
        const by = node.comments[1] ? `<span class="by">${studyComments_1.authorText(comment.by)}</span>` : '', truncated = truncateComment(comment.text, 300, ctx);
        return snabbdom_1.h('comment', {
            hook: util_1.innerHTML(truncated, text => by + util_1.enrichText(text))
        });
    }).filter(nonEmpty);
}
exports.renderInlineCommentsOf = renderInlineCommentsOf;
function truncateComment(text, len, ctx) {
    return ctx.truncateComments && text.length > len ? text.slice(0, len - 10) + ' [...]' : text;
}
exports.truncateComment = truncateComment;
function mainHook(ctrl) {
    return {
        insert: vnode => {
            const el = vnode.elm;
            if (ctrl.path !== '')
                exports.autoScroll(ctrl, el);
            el.oncontextmenu = (e) => {
                const path = eventPath(e);
                if (path !== null)
                    contextMenu_1.default(e, {
                        path,
                        root: ctrl
                    });
                ctrl.redraw();
                return false;
            };
            el.addEventListener('mousedown', (e) => {
                if (common_1.defined(e.button) && e.button !== 0)
                    return; // only touch or left click
                const path = eventPath(e);
                if (path)
                    ctrl.userJump(path);
                ctrl.redraw();
            });
        },
        postpatch: (_, vnode) => {
            if (ctrl.autoScrollRequested) {
                exports.autoScroll(ctrl, vnode.elm);
                ctrl.autoScrollRequested = false;
            }
        }
    };
}
exports.mainHook = mainHook;
function retroLine(ctx, node, opts) {
    return node.comp && ctx.ctrl.retro && ctx.ctrl.retro.hideComputerLine(node, opts.parentPath) ?
        snabbdom_1.h('line', ctx.ctrl.trans.noarg('learnFromThisMistake')) : undefined;
}
exports.retroLine = retroLine;
function eventPath(e) {
    return e.target.getAttribute('p') ||
        e.target.parentNode.getAttribute('p');
}
exports.autoScroll = throttle_1.default(200, (ctrl, el) => {
    const cont = el.parentNode;
    if (!cont)
        return;
    const target = el.querySelector('.active');
    if (!target) {
        cont.scrollTop = ctrl.path ? 99999 : 0;
        return;
    }
    cont.scrollTop = target.offsetTop - cont.offsetHeight / 2 + target.offsetHeight;
});
function nonEmpty(x) {
    return !!x;
}
exports.nonEmpty = nonEmpty;

},{"../study/studyComments":96,"../util":110,"./columnView":106,"./contextMenu":107,"./inlineView":108,"common":131,"common/storage":135,"common/throttle":137,"game":138,"snabbdom":35,"tree":142}],110:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const chess_1 = require("chess");
exports.emptyRedButton = 'button.button.button-red.button-empty';
function plyColor(ply) {
    return (ply % 2 === 0) ? 'white' : 'black';
}
exports.plyColor = plyColor;
function bindMobileMousedown(el, f, redraw) {
    for (const mousedownEvent of ['touchstart', 'mousedown']) {
        el.addEventListener(mousedownEvent, e => {
            f(e);
            e.preventDefault();
            if (redraw)
                redraw();
        });
    }
}
exports.bindMobileMousedown = bindMobileMousedown;
function listenTo(el, eventName, f, redraw) {
    el.addEventListener(eventName, e => {
        const res = f(e);
        if (res === false)
            e.preventDefault();
        if (redraw)
            redraw();
        return res;
    });
}
function bind(eventName, f, redraw) {
    return onInsert(el => listenTo(el, eventName, f, redraw));
}
exports.bind = bind;
function bindSubmit(f, redraw) {
    return bind('submit', e => {
        e.preventDefault();
        return f(e);
    }, redraw);
}
exports.bindSubmit = bindSubmit;
function onInsert(f) {
    return {
        insert: vnode => f(vnode.elm)
    };
}
exports.onInsert = onInsert;
function readOnlyProp(value) {
    return function () {
        return value;
    };
}
exports.readOnlyProp = readOnlyProp;
function dataIcon(icon) {
    return {
        'data-icon': icon
    };
}
exports.dataIcon = dataIcon;
function iconTag(icon) {
    return snabbdom_1.h('i', { attrs: dataIcon(icon) });
}
exports.iconTag = iconTag;
function plyToTurn(ply) {
    return Math.floor((ply - 1) / 2) + 1;
}
exports.plyToTurn = plyToTurn;
function nodeFullName(node) {
    if (node.san)
        return plyToTurn(node.ply) + (node.ply % 2 === 1 ? '.' : '...') + ' ' + chess_1.fixCrazySan(node.san);
    return 'Initial position';
}
exports.nodeFullName = nodeFullName;
function plural(noun, nb) {
    return nb + ' ' + (nb === 1 ? noun : noun + 's');
}
exports.plural = plural;
function titleNameToId(titleName) {
    const split = titleName.split(' ');
    return (split.length === 1 ? split[0] : split[1]).toLowerCase();
}
exports.titleNameToId = titleNameToId;
function spinner() {
    return snabbdom_1.h('div.spinner', [
        snabbdom_1.h('svg', { attrs: { viewBox: '0 0 40 40' } }, [
            snabbdom_1.h('circle', {
                attrs: { cx: 20, cy: 20, r: 18, fill: 'none' }
            })
        ])
    ]);
}
exports.spinner = spinner;
function innerHTML(a, toHtml) {
    return {
        insert(vnode) {
            vnode.elm.innerHTML = toHtml(a);
            vnode.data.cachedA = a;
        },
        postpatch(old, vnode) {
            if (old.data.cachedA !== a) {
                vnode.elm.innerHTML = toHtml(a);
            }
            vnode.data.cachedA = a;
        }
    };
}
exports.innerHTML = innerHTML;
function richHTML(text, newLines = true) {
    return innerHTML(text, t => enrichText(t, newLines));
}
exports.richHTML = richHTML;
function baseUrl() {
    return `${window.location.protocol}//${window.location.host}`;
}
exports.baseUrl = baseUrl;
function toYouTubeEmbed(url) {
    const embedUrl = toYouTubeEmbedUrl(url);
    if (embedUrl)
        return `<div class="embed"><iframe width="100%" src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
}
exports.toYouTubeEmbed = toYouTubeEmbed;
function toYouTubeEmbedUrl(url) {
    if (!url)
        return;
    var m = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch)?(?:\?v=)?([^"&?\/ ]{11})(?:\?|&|)(\S*)/i);
    if (!m)
        return;
    var start = 0;
    m[2].split('&').forEach(function (p) {
        var s = p.split('=');
        if (s[0] === 't' || s[0] === 'start') {
            if (s[1].match(/^\d+$/))
                start = parseInt(s[1]);
            else {
                var n = s[1].match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
                start = (parseInt(n[1]) || 0) * 3600 + (parseInt(n[2]) || 0) * 60 + (parseInt(n[3]) || 0);
            }
        }
    });
    var params = 'modestbranding=1&rel=0&controls=2&iv_load_policy=3' + (start ? '&start=' + start : '');
    return 'https://www.youtube.com/embed/' + m[1] + '?' + params;
}
function toTwitchEmbed(url) {
    const embedUrl = toTwitchEmbedUrl(url);
    if (embedUrl)
        return `<div class="embed"><iframe width="100%" src="${embedUrl}" frameborder=0 allowfullscreen></iframe></div>`;
}
exports.toTwitchEmbed = toTwitchEmbed;
function toTwitchEmbedUrl(url) {
    if (!url)
        return;
    var m = url.match(/(?:https?:\/\/)?(?:www\.)?(?:twitch.tv)\/([^"&?/ ]+)/i);
    if (m)
        return 'https://player.twitch.tv/?channel=' + m[1] + '&autoplay=false';
}
const commentYoutubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:.*?(?:[?&]v=)|v\/)|youtu\.be\/)(?:[^"&?\/ ]{11})\b/i;
const commentTwitchRegex = /(?:https?:\/\/)?(?:www\.)?(?:twitch.tv)\/([^"&?/ ]+)(?:\?|&|)(\S*)/i;
const imgUrlRegex = /\.(jpg|jpeg|png|gif)$/;
const newLineRegex = /\n/g;
function imageTag(url) {
    if (imgUrlRegex.test(url))
        return `<img src="${url}" class="embed"/>`;
}
function toLink(url) {
    if (commentYoutubeRegex.test(url))
        return toYouTubeEmbed(url) || url;
    if (commentTwitchRegex.test(url))
        return toTwitchEmbed(url) || url;
    const show = imageTag(url) || url.replace(/https?:\/\//, '');
    return '<a target="_blank" rel="nofollow" href="' + url + '">' + show + '</a>';
}
function enrichText(text, allowNewlines = true) {
    let html = autolink(window.lichess.escapeHtml(text), toLink);
    if (allowNewlines)
        html = html.replace(newLineRegex, '<br>');
    return html;
}
exports.enrichText = enrichText;
// from https://github.com/bryanwoods/autolink-js/blob/master/autolink.js
const linkRegex = /(^|[\s\n]|<[A-Za-z]*\/?>)((?:https?|ftp):\/\/[\-A-Z0-9+\u0026\u2019@#\/%?=()~_|!:,.;]*[\-A-Z0-9+\u0026@#\/%=~()_|])/gi;
function autolink(str, callback) {
    return str.replace(linkRegex, (_, space, url) => space + callback(url));
}
exports.autolink = autolink;
function option(value, current, name) {
    return snabbdom_1.h('option', {
        attrs: {
            value: value,
            selected: value === current
        },
    }, name);
}
exports.option = option;
function scrollTo(el, target) {
    if (el && target)
        el.scrollTop = target.offsetTop - el.offsetHeight / 2 + target.offsetHeight / 2;
}
exports.scrollTo = scrollTo;

},{"chess":129,"snabbdom":35}],111:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const chessground = require("./ground");
const util_1 = require("./util");
const game_1 = require("game");
const router = require("game/router");
const status_1 = require("game/view/status");
const tree_1 = require("tree");
const treeView_1 = require("./treeView/treeView");
const control = require("./control");
const actionMenu_1 = require("./actionMenu");
const promotion_1 = require("./promotion");
const clocks_1 = require("./clocks");
const pgnExport = require("./pgnExport");
const forecastView_1 = require("./forecast/forecastView");
const ceval_1 = require("ceval");
const crazyView_1 = require("./crazy/crazyView");
const keyboard_1 = require("./keyboard");
const explorerView_1 = require("./explorer/explorerView");
const retroView_1 = require("./retrospect/retroView");
const practiceView_1 = require("./practice/practiceView");
const gbEdit = require("./study/gamebook/gamebookEdit");
const gbPlay = require("./study/gamebook/gamebookPlayView");
const studyView = require("./study/studyView");
const studyPracticeView = require("./study/practice/studyPracticeView");
const fork_1 = require("./fork");
const acpl_1 = require("./acpl");
const relayManagerView_1 = require("./study/relay/relayManagerView");
const relayIntroView_1 = require("./study/relay/relayIntroView");
const playerBars_1 = require("./study/playerBars");
const serverSideUnderboard_1 = require("./serverSideUnderboard");
const gridHacks = require("./gridHacks");
const li = window.lichess;
function renderResult(ctrl) {
    let result;
    if (ctrl.data.game.status.id >= 30)
        switch (ctrl.data.game.winner) {
            case 'white':
                result = '1-0';
                break;
            case 'black':
                result = '0-1';
                break;
            default:
                result = '½-½';
        }
    const tags = [];
    if (result) {
        tags.push(snabbdom_1.h('div.result', result));
        const winner = game_1.getPlayer(ctrl.data, ctrl.data.game.winner);
        tags.push(snabbdom_1.h('div.status', [
            status_1.default(ctrl),
            winner ? ', ' + ctrl.trans(winner.color == 'white' ? 'whiteIsVictorious' : 'blackIsVictorious') : null
        ]));
    }
    return tags;
}
function makeConcealOf(ctrl) {
    const conceal = (ctrl.study && ctrl.study.data.chapter.conceal !== undefined) ? {
        owner: ctrl.study.isChapterOwner(),
        ply: ctrl.study.data.chapter.conceal
    } : null;
    if (conceal)
        return function (isMainline) {
            return function (path, node) {
                if (!conceal || (isMainline && conceal.ply >= node.ply))
                    return null;
                if (tree_1.path.contains(ctrl.path, path))
                    return null;
                return conceal.owner ? 'conceal' : 'hide';
            };
        };
}
function renderAnalyse(ctrl, concealOf) {
    return snabbdom_1.h('div.analyse__moves.areplay', [
        (ctrl.embed && ctrl.study) ? snabbdom_1.h('div.chapter-name', ctrl.study.currentChapter().name) : null,
        renderOpeningBox(ctrl),
        treeView_1.render(ctrl, concealOf),
    ].concat(renderResult(ctrl)));
}
function wheel(ctrl, e) {
    const target = e.target;
    if (target.tagName !== 'PIECE' && target.tagName !== 'SQUARE' && target.tagName !== 'CG-BOARD')
        return;
    e.preventDefault();
    if (e.deltaY > 0)
        control.next(ctrl);
    else if (e.deltaY < 0)
        control.prev(ctrl);
    ctrl.redraw();
    return false;
}
function inputs(ctrl) {
    if (ctrl.ongoing || !ctrl.data.userAnalysis)
        return;
    if (ctrl.redirecting)
        return util_1.spinner();
    return snabbdom_1.h('div.copyables', [
        snabbdom_1.h('div.pair', [
            snabbdom_1.h('label.name', 'FEN'),
            snabbdom_1.h('input.copyable.autoselect.analyse__underboard__fen', {
                attrs: {
                    spellCheck: false,
                    value: ctrl.node.fen
                },
                hook: util_1.bind('change', e => {
                    const value = e.target.value;
                    if (value !== ctrl.node.fen)
                        ctrl.changeFen(value);
                })
            })
        ]),
        snabbdom_1.h('div.pgn', [
            snabbdom_1.h('div.pair', [
                snabbdom_1.h('label.name', 'PGN'),
                snabbdom_1.h('textarea.copyable.autoselect', {
                    attrs: { spellCheck: false },
                    hook: {
                        postpatch: (_, vnode) => {
                            vnode.elm.value = pgnExport.renderFullTxt(ctrl);
                        }
                    }
                }),
                snabbdom_1.h('button.button.button-thin.action.text', {
                    attrs: util_1.dataIcon('G'),
                    hook: util_1.bind('click', _ => {
                        const pgn = $('.copyables .pgn textarea').val();
                        if (pgn !== pgnExport.renderFullTxt(ctrl))
                            ctrl.changePgn(pgn);
                    }, ctrl.redraw)
                }, ctrl.trans.noarg('importPgn'))
            ])
        ])
    ]);
}
function jumpButton(icon, effect, enabled) {
    return snabbdom_1.h('button.fbt', {
        class: { disabled: !enabled },
        attrs: { 'data-act': effect, 'data-icon': icon }
    });
}
function dataAct(e) {
    const target = e.target;
    return target.getAttribute('data-act') ||
        target.parentNode.getAttribute('data-act');
}
function repeater(ctrl, action, e) {
    const repeat = function () {
        control[action](ctrl);
        ctrl.redraw();
        delay = Math.max(100, delay - delay / 15);
        timeout = setTimeout(repeat, delay);
    };
    let delay = 350;
    let timeout = setTimeout(repeat, 500);
    control[action](ctrl);
    const eventName = e.type == 'touchstart' ? 'touchend' : 'mouseup';
    document.addEventListener(eventName, () => clearTimeout(timeout), { once: true });
}
function controls(ctrl) {
    const canJumpPrev = ctrl.path !== '', canJumpNext = !!ctrl.node.children[0], menuIsOpen = ctrl.actionMenu.open, noarg = ctrl.trans.noarg;
    return snabbdom_1.h('div.analyse__controls.analyse-controls', {
        hook: util_1.onInsert(el => {
            util_1.bindMobileMousedown(el, e => {
                const action = dataAct(e);
                if (action === 'prev' || action === 'next')
                    repeater(ctrl, action, e);
                else if (action === 'first')
                    control.first(ctrl);
                else if (action === 'last')
                    control.last(ctrl);
                else if (action === 'explorer')
                    ctrl.toggleExplorer();
                else if (action === 'practice')
                    ctrl.togglePractice();
                else if (action === 'menu')
                    ctrl.actionMenu.toggle();
            }, ctrl.redraw);
        })
    }, [
        ctrl.embed ? null : snabbdom_1.h('div.features', ctrl.studyPractice ? [
            snabbdom_1.h('a.fbt', {
                attrs: {
                    title: noarg('analysis'),
                    target: '_blank',
                    href: ctrl.studyPractice.analysisUrl(),
                    'data-icon': 'A'
                }
            })
        ] : [
            snabbdom_1.h('button.fbt', {
                attrs: {
                    title: noarg('openingExplorerAndTablebase'),
                    'data-act': 'explorer',
                    'data-icon': ']'
                },
                class: {
                    hidden: menuIsOpen || !ctrl.explorer.allowed() || !!ctrl.retro,
                    active: ctrl.explorer.enabled()
                }
            }),
            ctrl.ceval.possible && ctrl.ceval.allowed() && !ctrl.isGamebook() ? snabbdom_1.h('button.fbt', {
                attrs: {
                    title: noarg('practiceWithComputer'),
                    'data-act': 'practice',
                    'data-icon': ''
                },
                class: {
                    hidden: menuIsOpen || !!ctrl.retro,
                    active: !!ctrl.practice
                }
            }) : null
        ]),
        snabbdom_1.h('div.jumps', [
            jumpButton('W', 'first', canJumpPrev),
            jumpButton('Y', 'prev', canJumpPrev),
            jumpButton('X', 'next', canJumpNext),
            jumpButton('V', 'last', canJumpNext)
        ]),
        ctrl.studyPractice ? snabbdom_1.h('div.noop') : snabbdom_1.h('button.fbt', {
            class: { active: menuIsOpen },
            attrs: {
                title: noarg('menu'),
                'data-act': 'menu',
                'data-icon': '['
            }
        })
    ]);
}
function renderOpeningBox(ctrl) {
    let opening = ctrl.tree.getOpening(ctrl.nodeList);
    if (!opening && !ctrl.path)
        opening = ctrl.data.game.opening;
    if (opening)
        return snabbdom_1.h('div.opening_box', {
            attrs: { title: opening.eco + ' ' + opening.name }
        }, [
            snabbdom_1.h('strong', opening.eco),
            ' ' + opening.name
        ]);
}
function forceInnerCoords(ctrl, v) {
    if (ctrl.data.pref.coords == 2)
        $('body').toggleClass('coords-in', v).toggleClass('coords-out', !v);
}
function addChapterId(study, cssClass) {
    return cssClass + (study && study.data.chapter ? '.' + study.data.chapter.id : '');
}
function default_1(ctrl) {
    if (ctrl.nvui)
        return ctrl.nvui.render(ctrl);
    const concealOf = makeConcealOf(ctrl), study = ctrl.study, showCevalPvs = !(ctrl.retro && ctrl.retro.isSolving()) && !ctrl.practice, menuIsOpen = ctrl.actionMenu.open, gamebookPlay = ctrl.gamebookPlay(), gamebookPlayView = gamebookPlay && gbPlay.render(gamebookPlay), gamebookEditView = gbEdit.running(ctrl) ? gbEdit.render(ctrl) : undefined, playerBars = playerBars_1.default(ctrl), clocks = !playerBars && clocks_1.default(ctrl), gaugeOn = ctrl.showEvalGauge(), needsInnerCoords = !!gaugeOn || !!playerBars, intro = relayIntroView_1.default(ctrl);
    return snabbdom_1.h('main.analyse.variant-' + ctrl.data.game.variant.key, {
        hook: {
            insert: vn => {
                forceInnerCoords(ctrl, needsInnerCoords);
                if (!!playerBars != $('body').hasClass('header-margin')) {
                    li.raf(() => {
                        $('body').toggleClass('header-margin', !!playerBars);
                        ctrl.redraw();
                    });
                }
                gridHacks.start(vn.elm);
            },
            update(_, _2) {
                forceInnerCoords(ctrl, needsInnerCoords);
            },
            postpatch(old, vnode) {
                if (old.data.gaugeOn !== gaugeOn)
                    li.dispatchEvent(document.body, 'chessground.resize');
                vnode.data.gaugeOn = gaugeOn;
            }
        },
        class: {
            'comp-off': !ctrl.showComputer(),
            'gauge-on': gaugeOn,
            'has-players': !!playerBars,
            'has-clocks': !!clocks,
            'has-intro': !!intro
        }
    }, [
        ctrl.keyboardHelp ? keyboard_1.view(ctrl) : null,
        study ? studyView.overboard(study) : null,
        intro || snabbdom_1.h(addChapterId(study, 'div.analyse__board.main-board'), {
            hook: (window.lichess.hasTouchEvents || ctrl.gamebookPlay()) ? undefined : util_1.bind('wheel', (e) => wheel(ctrl, e))
        }, [
            ...(clocks || []),
            playerBars ? playerBars[ctrl.bottomIsWhite() ? 1 : 0] : null,
            chessground.render(ctrl),
            playerBars ? playerBars[ctrl.bottomIsWhite() ? 0 : 1] : null,
            promotion_1.view(ctrl)
        ]),
        (gaugeOn && !intro) ? ceval_1.view.renderGauge(ctrl) : null,
        (menuIsOpen || intro) ? null : crazyView_1.default(ctrl, ctrl.topColor(), 'top'),
        gamebookPlayView || (intro ? null : snabbdom_1.h(addChapterId(study, 'div.analyse__tools'), [
            ...(menuIsOpen ? [actionMenu_1.view(ctrl)] : [
                ceval_1.view.renderCeval(ctrl),
                showCevalPvs ? ceval_1.view.renderPvs(ctrl) : null,
                renderAnalyse(ctrl, concealOf),
                gamebookEditView || fork_1.view(ctrl, concealOf),
                retroView_1.default(ctrl) || practiceView_1.default(ctrl) || explorerView_1.default(ctrl)
            ])
        ])),
        (menuIsOpen || intro) ? null : crazyView_1.default(ctrl, ctrl.bottomColor(), 'bottom'),
        (gamebookPlayView || intro) ? null : controls(ctrl),
        (ctrl.embed || intro) ? null : snabbdom_1.h('div.analyse__underboard', {
            hook: (ctrl.synthetic || game_1.playable(ctrl.data)) ? undefined : util_1.onInsert(elm => serverSideUnderboard_1.default(elm, ctrl))
        }, study ? studyView.underboard(ctrl) : [inputs(ctrl)]),
        intro ? null : acpl_1.render(ctrl),
        ctrl.embed ? null : (ctrl.studyPractice ? studyPracticeView.side(study) :
            snabbdom_1.h('aside.analyse__side', {
                hook: util_1.onInsert(elm => {
                    ctrl.opts.$side && ctrl.opts.$side.length && $(elm).replaceWith(ctrl.opts.$side);
                    $(elm).append($('.streamers').clone().removeClass('none'));
                })
            }, ctrl.studyPractice ? [studyPracticeView.side(study)] : (study ? [studyView.side(study)] : [
                ctrl.forecast ? forecastView_1.default(ctrl, ctrl.forecast) : null,
                (!ctrl.synthetic && game_1.playable(ctrl.data)) ? snabbdom_1.h('div.back-to-game', snabbdom_1.h('a.button.button-empty.text', {
                    attrs: {
                        href: router.game(ctrl.data, ctrl.data.player.color),
                        'data-icon': 'i'
                    }
                }, ctrl.trans.noarg('backToGame'))) : null
            ]))),
        study && study.relay && relayManagerView_1.default(study.relay),
        ctrl.opts.chat && snabbdom_1.h('section.mchat', {
            hook: util_1.onInsert(_ => {
                if (ctrl.opts.chat.instance)
                    ctrl.opts.chat.instance.destroy();
                ctrl.opts.chat.parseMoves = true;
                li.makeChat(ctrl.opts.chat, chat => {
                    ctrl.opts.chat.instance = chat;
                });
            })
        }),
        ctrl.embed ? null : snabbdom_1.h('div.chat__members.none', {
            hook: util_1.onInsert(el => $(el).watchers())
        }, [snabbdom_1.h('span.number', '\xa0'), ' ', ctrl.trans.noarg('spectators'), ' ', snabbdom_1.h('span.list')])
    ]);
}
exports.default = default_1;

},{"./acpl":38,"./actionMenu":39,"./clocks":44,"./control":45,"./crazy/crazyView":47,"./explorer/explorerView":53,"./forecast/forecastView":57,"./fork":58,"./gridHacks":59,"./ground":60,"./keyboard":61,"./pgnExport":66,"./practice/practiceView":68,"./promotion":69,"./retrospect/retroView":71,"./serverSideUnderboard":72,"./study/gamebook/gamebookEdit":80,"./study/gamebook/gamebookPlayView":82,"./study/playerBars":86,"./study/practice/studyPracticeView":90,"./study/relay/relayIntroView":92,"./study/relay/relayManagerView":93,"./study/studyView":104,"./treeView/treeView":109,"./util":110,"ceval":113,"game":138,"game/router":139,"game/view/status":141,"snabbdom":35,"tree":142}],112:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pool_1 = require("./pool");
const common_1 = require("common");
const storage_1 = require("common/storage");
const throttle_1 = require("common/throttle");
const winningChances_1 = require("./winningChances");
const li = window.lichess;
function sanIrreversible(variant, san) {
    if (san.startsWith('O-O'))
        return true;
    if (variant === 'crazyhouse')
        return false;
    if (san.includes('x'))
        return true; // capture
    if (san.toLowerCase() === san)
        return true; // pawn move
    return variant === 'threeCheck' && san.includes('+');
}
function officialStockfish(variant) {
    return variant === 'standard' || variant === 'chess960';
}
function is64Bit() {
    const x64 = ['x86_64', 'x86-64', 'Win64', 'x64', 'amd64', 'AMD64'];
    for (const substr of x64)
        if (navigator.userAgent.includes(substr))
            return true;
    return navigator.platform === 'Linux x86_64' || navigator.platform === 'MacIntel';
}
function sharedWasmMemory(initial, maximum) {
    // In theory 32 bit should be supported just the same, but some 32 bit
    // browser builds seem to have trouble with WASMX. So for now detect and
    // require a 64 bit platform.
    if (!is64Bit())
        return;
    // Atomics
    if (typeof Atomics !== 'object')
        return;
    // SharedArrayBuffer
    if (typeof SharedArrayBuffer !== 'function')
        return;
    // Shared memory
    const mem = new WebAssembly.Memory({ shared: true, initial, maximum });
    if (!(mem.buffer instanceof SharedArrayBuffer))
        return;
    // Structured cloning
    try {
        window.postMessage(mem, '*');
    }
    catch (e) {
        return;
    }
    return mem;
}
function median(values) {
    values.sort((a, b) => a - b);
    const half = Math.floor(values.length / 2);
    return values.length % 2 ? values[half] : (values[half - 1] + values[half]) / 2.0;
}
function default_1(opts) {
    const storageKey = (k) => {
        return opts.storageKeyPrefix ? `${opts.storageKeyPrefix}.${k}` : k;
    };
    // select wasmx with growable shared mem > wasmx > wasm > asmjs
    let technology = 'asmjs';
    let growableSharedMem = false;
    if (typeof WebAssembly === 'object' && WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00))) {
        technology = 'wasm'; // WebAssembly 1.0
        if (officialStockfish(opts.variant.key)) {
            const sharedMem = sharedWasmMemory(8, 16);
            if (sharedMem) {
                technology = 'wasmx';
                try {
                    sharedMem.grow(8);
                    growableSharedMem = true;
                }
                catch (e) { }
            }
        }
    }
    const maxThreads = Math.min(Math.max((navigator.hardwareConcurrency || 1) - 1, 1), growableSharedMem ? 16 : 2);
    const threads = storage_1.storedProp(storageKey('ceval.threads'), Math.min(Math.ceil((navigator.hardwareConcurrency || 1) / 4), maxThreads));
    const maxHashSize = Math.min((navigator.deviceMemory || 0.25) * 1024 / 8, growableSharedMem ? 1024 : 16);
    const hashSize = storage_1.storedProp(storageKey('ceval.hash-size'), 16);
    const minDepth = 6;
    const maxDepth = storage_1.storedProp(storageKey('ceval.max-depth'), 18);
    const multiPv = storage_1.storedProp(storageKey('ceval.multipv'), opts.multiPvDefault || 1);
    const infinite = storage_1.storedProp('ceval.infinite', false);
    let curEval = null;
    const enableStorage = li.storage.makeBoolean(storageKey('client-eval-enabled'));
    const allowed = common_1.prop(true);
    const enabled = common_1.prop(opts.possible && allowed() && enableStorage.get() && !document.hidden);
    let started = false;
    let lastStarted = false; // last started object (for going deeper even if stopped)
    const hovering = common_1.prop(null);
    const isDeeper = common_1.prop(false);
    const pool = new pool_1.Pool({
        technology,
        asmjs: 'vendor/stockfish.js/stockfish.js',
        wasm: 'vendor/stockfish.js/stockfish.wasm.js',
        wasmx: officialStockfish(opts.variant.key) ? 'vendor/stockfish.wasm/stockfish.js' : 'vendor/stockfish-mv.wasm/stockfish.js',
    }, {
        minDepth,
        variant: opts.variant.key,
        threads: technology == 'wasmx' && (() => Math.min(parseInt(threads()), maxThreads)),
        hashSize: technology == 'wasmx' && (() => Math.min(parseInt(hashSize()), maxHashSize)),
    });
    // adjusts maxDepth based on nodes per second
    const npsRecorder = (function () {
        const values = [];
        const applies = function (ev) {
            return ev.knps && ev.depth >= 16 &&
                typeof ev.cp !== 'undefined' && Math.abs(ev.cp) < 500 &&
                (ev.fen.split(/\s/)[0].split(/[nbrqkp]/i).length - 1) >= 10;
        };
        return function (ev) {
            if (!applies(ev))
                return;
            values.push(ev.knps);
            if (values.length > 9) {
                let depth = 18, knps = median(values) || 0;
                if (knps > 100)
                    depth = 19;
                if (knps > 150)
                    depth = 20;
                if (knps > 250)
                    depth = 21;
                if (knps > 500)
                    depth = 22;
                if (knps > 1000)
                    depth = 23;
                if (knps > 2000)
                    depth = 24;
                if (knps > 3500)
                    depth = 25;
                if (knps > 5000)
                    depth = 26;
                if (knps > 7000)
                    depth = 27;
                maxDepth(depth);
                if (values.length > 40)
                    values.shift();
            }
        };
    })();
    let lastEmitFen = null;
    const onEmit = throttle_1.default(200, (ev, work) => {
        sortPvsInPlace(ev.pvs, (work.ply % 2 === (work.threatMode ? 1 : 0)) ? 'white' : 'black');
        npsRecorder(ev);
        curEval = ev;
        opts.emit(ev, work);
        if (ev.fen !== lastEmitFen) {
            lastEmitFen = ev.fen;
            li.storage.fire('ceval.fen', ev.fen);
        }
    });
    const effectiveMaxDepth = () => (isDeeper() || infinite()) ? 99 : parseInt(maxDepth());
    const sortPvsInPlace = (pvs, color) => pvs.sort(function (a, b) {
        return winningChances_1.povChances(color, b) - winningChances_1.povChances(color, a);
    });
    const start = (path, steps, threatMode, deeper) => {
        if (!enabled() || !opts.possible)
            return;
        isDeeper(deeper);
        const maxD = effectiveMaxDepth();
        const step = steps[steps.length - 1];
        const existing = threatMode ? step.threat : step.ceval;
        if (existing && existing.depth >= maxD)
            return;
        const work = {
            initialFen: steps[0].fen,
            moves: [],
            currentFen: step.fen,
            path,
            ply: step.ply,
            maxDepth: maxD,
            multiPv: parseInt(multiPv()),
            threatMode,
            emit(ev) {
                if (enabled())
                    onEmit(ev, work);
            }
        };
        if (threatMode) {
            const c = step.ply % 2 === 1 ? 'w' : 'b';
            const fen = step.fen.replace(/ (w|b) /, ' ' + c + ' ');
            work.currentFen = fen;
            work.initialFen = fen;
        }
        else {
            // send fen after latest castling move and the following moves
            for (let i = 1; i < steps.length; i++) {
                let s = steps[i];
                if (sanIrreversible(opts.variant.key, s.san)) {
                    work.moves = [];
                    work.initialFen = s.fen;
                }
                else
                    work.moves.push(s.uci);
            }
        }
        pool.start(work);
        started = {
            path,
            steps,
            threatMode
        };
    };
    function goDeeper() {
        const s = started || lastStarted;
        if (s) {
            stop();
            start(s.path, s.steps, s.threatMode, true);
        }
    }
    ;
    function stop() {
        if (!enabled() || !started)
            return;
        pool.stop();
        lastStarted = started;
        started = false;
    }
    ;
    // ask other tabs if a game is in progress
    if (enabled()) {
        li.storage.fire('ceval.fen', 'start');
        li.storage.make('round.ongoing').listen(_ => {
            enabled(false);
            opts.redraw();
        });
    }
    return {
        technology,
        start,
        stop,
        allowed,
        possible: opts.possible,
        enabled,
        multiPv,
        threads: technology == 'wasmx' ? threads : undefined,
        hashSize: technology == 'wasmx' ? hashSize : undefined,
        maxThreads,
        maxHashSize,
        infinite,
        hovering,
        setHovering(fen, uci) {
            hovering(uci ? {
                fen,
                uci
            } : null);
            opts.setAutoShapes();
        },
        toggle() {
            if (!opts.possible || !allowed())
                return;
            stop();
            enabled(!enabled());
            if (document.visibilityState !== 'hidden')
                enableStorage.set(enabled());
        },
        curDepth: () => curEval ? curEval.depth : 0,
        effectiveMaxDepth,
        variant: opts.variant,
        isDeeper,
        goDeeper,
        canGoDeeper: () => !isDeeper() && !infinite() && !pool.isComputing(),
        isComputing: () => !!started && pool.isComputing(),
        engineName: pool.engineName,
        destroy: pool.destroy,
        redraw: opts.redraw
    };
}
exports.default = default_1;
;

},{"./pool":114,"./winningChances":117,"common":131,"common/storage":135,"common/throttle":137}],113:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ctrl_1 = require("./ctrl");
exports.ctrl = ctrl_1.default;
const view = require("./view");
exports.view = view;
const winningChances = require("./winningChances");
exports.winningChances = winningChances;
function isEvalBetter(a, b) {
    return !b || a.depth > b.depth || (a.depth === b.depth && a.nodes > b.nodes);
}
exports.isEvalBetter = isEvalBetter;
// stop when another tab starts. Listen only once here,
// as the ctrl can be instanciated several times.
// gotta do the click on the toggle to have it visually change.
window.lichess.storage.make('ceval.pool.start').listen(_ => {
    const toggle = document.getElementById('analyse-toggle-ceval');
    if (toggle && toggle.checked)
        toggle.click();
});

},{"./ctrl":112,"./view":116,"./winningChances":117}],114:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sync_1 = require("common/sync");
const stockfishProtocol_1 = require("./stockfishProtocol");
class AbstractWorker {
    constructor(url, poolOpts, workerOpts) {
        this.url = url;
        this.poolOpts = poolOpts;
        this.workerOpts = workerOpts;
        this.isComputing = () => !!this.protocol.sync && this.protocol.sync.isComputing();
        this.engineName = () => this.protocol.sync && this.protocol.sync.engineName;
        this.protocol = sync_1.sync(this.boot());
    }
    stop() {
        return this.protocol.promise.then(protocol => protocol.stop());
    }
    start(work) {
        return this.protocol.promise.then(protocol => {
            return protocol.stop().then(() => protocol.start(work));
        });
    }
}
exports.AbstractWorker = AbstractWorker;
class WebWorker extends AbstractWorker {
    boot() {
        this.worker = new Worker(window.lichess.assetUrl(this.url, { sameDomain: true }));
        const protocol = new stockfishProtocol_1.default(this.send.bind(this), this.workerOpts);
        this.worker.addEventListener('message', e => {
            protocol.received(e.data);
        }, true);
        return Promise.resolve(protocol);
    }
    start(work) {
        // wait for boot
        return this.protocol.promise.then(protocol => {
            const timeout = new Promise((_, reject) => setTimeout(reject, 1000));
            return Promise.race([protocol.stop(), timeout]).catch(() => {
                // reboot if not stopped after 1s
                this.destroy();
                this.protocol = sync_1.sync(this.boot());
            }).then(() => {
                return this.protocol.promise.then(protocol => protocol.start(work));
            });
        });
    }
    destroy() {
        this.worker.terminate();
    }
    send(cmd) {
        this.worker.postMessage(cmd);
    }
}
class ThreadedWasmWorker extends AbstractWorker {
    boot() {
        if (!ThreadedWasmWorker.global)
            ThreadedWasmWorker.global = window.lichess.loadScript(this.url, { sameDomain: true }).then(() => {
                const instance = this.instance = window['Stockfish'](), protocol = new stockfishProtocol_1.default(this.send.bind(this), this.workerOpts), listener = protocol.received.bind(protocol);
                instance.addMessageListener(listener);
                return {
                    instance,
                    protocol
                };
            });
        return ThreadedWasmWorker.global.then(global => {
            this.instance = global.instance;
            return global.protocol;
        });
    }
    destroy() {
        if (ThreadedWasmWorker.global) {
            console.log('stopping singleton wasmx worker (instead of destroying) ...');
            this.stop().then(() => console.log('... successfully stopped'));
        }
    }
    send(cmd) {
        if (this.instance)
            this.instance.postMessage(cmd);
    }
}
class Pool {
    constructor(poolOpts, protocolOpts) {
        this.poolOpts = poolOpts;
        this.protocolOpts = protocolOpts;
        this.workers = [];
        this.token = 0;
        this.warmup = () => {
            if (this.workers.length)
                return;
            if (this.poolOpts.technology == 'wasmx')
                this.workers.push(new ThreadedWasmWorker(this.poolOpts.wasmx, this.poolOpts, this.protocolOpts));
            else {
                for (let i = 1; i <= 2; i++)
                    this.workers.push(new WebWorker(this.poolOpts.technology == 'wasm' ? this.poolOpts.wasm : this.poolOpts.asmjs, this.poolOpts, this.protocolOpts));
            }
        };
        this.stop = () => this.workers.forEach(w => w.stop());
        this.destroy = () => {
            this.stop();
            this.workers.forEach(w => w.destroy());
        };
        this.start = (work) => {
            window.lichess.storage.fire('ceval.pool.start');
            this.getWorker().then(function (worker) {
                worker.start(work);
            }).catch(function (error) {
                console.log(error);
                setTimeout(() => window.lichess.reload(), 10000);
            });
        };
        this.isComputing = () => !!this.workers.length && this.workers[this.token].isComputing();
        this.engineName = () => this.workers[this.token] && this.workers[this.token].engineName();
    }
    getWorker() {
        this.warmup();
        // briefly wait and give a chance to reuse the current worker
        const worker = new Promise((resolve, reject) => {
            const currentWorker = this.workers[this.token];
            currentWorker.stop().then(() => resolve(currentWorker));
            setTimeout(reject, 50);
        });
        return worker.catch(() => {
            this.token = (this.token + 1) % this.workers.length;
            return Promise.resolve(this.workers[this.token]);
        });
    }
}
exports.Pool = Pool;

},{"./stockfishProtocol":115,"common/sync":136}],115:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chess_1 = require("chess");
const EVAL_REGEX = new RegExp(''
    + /^info depth (\d+) seldepth \d+ multipv (\d+) /.source
    + /score (cp|mate) ([-\d]+) /.source
    + /(?:(upper|lower)bound )?nodes (\d+) nps \S+ /.source
    + /(?:hashfull \d+ )?(?:tbhits \d+ )?time (\S+) /.source
    + /pv (.+)/.source);
class Protocol {
    constructor(send, opts) {
        this.send = send;
        this.opts = opts;
        this.work = null;
        this.curEval = null;
        this.expectedPvs = 1;
        this.stopped = defer();
        this.stopped.resolve();
        // get engine name/version
        this.send('uci');
        // analyse without contempt
        this.setOption('UCI_AnalyseMode', 'true');
        this.setOption('Analysis Contempt', 'Off');
        if (opts.variant === 'fromPosition' || opts.variant === 'chess960')
            this.setOption('UCI_Chess960', 'true');
        else if (opts.variant === 'antichess')
            this.setOption('UCI_Variant', 'giveaway');
        else if (opts.variant !== 'standard')
            this.setOption('UCI_Variant', chess_1.variantToRules(opts.variant));
    }
    setOption(name, value) {
        this.send(`setoption name ${name} value ${value}`);
    }
    received(text) {
        if (text.startsWith('id name '))
            this.engineName = text.substring('id name '.length);
        else if (text.startsWith('bestmove ')) {
            if (!this.stopped)
                this.stopped = defer();
            this.stopped.resolve();
            if (this.work && this.curEval)
                this.work.emit(this.curEval);
            return;
        }
        if (!this.work)
            return;
        let matches = text.match(EVAL_REGEX);
        if (!matches)
            return;
        let depth = parseInt(matches[1]), multiPv = parseInt(matches[2]), isMate = matches[3] === 'mate', ev = parseInt(matches[4]), evalType = matches[5], nodes = parseInt(matches[6]), elapsedMs = parseInt(matches[7]), moves = matches[8].split(' ');
        // Sometimes we get #0. Let's just skip it.
        if (isMate && !ev)
            return;
        // Track max pv index to determine when pv prints are done.
        if (this.expectedPvs < multiPv)
            this.expectedPvs = multiPv;
        if (depth < this.opts.minDepth)
            return;
        let pivot = this.work.threatMode ? 0 : 1;
        if (this.work.ply % 2 === pivot)
            ev = -ev;
        // For now, ignore most upperbound/lowerbound messages.
        // The exception is for multiPV, sometimes non-primary PVs
        // only have an upperbound.
        // See: https://github.com/ddugovic/Stockfish/issues/228
        if (evalType && multiPv === 1)
            return;
        let pvData = {
            moves,
            cp: isMate ? undefined : ev,
            mate: isMate ? ev : undefined,
            depth,
        };
        if (multiPv === 1) {
            this.curEval = {
                fen: this.work.currentFen,
                maxDepth: this.work.maxDepth,
                depth,
                knps: nodes / elapsedMs,
                nodes,
                cp: isMate ? undefined : ev,
                mate: isMate ? ev : undefined,
                pvs: [pvData],
                millis: elapsedMs
            };
        }
        else if (this.curEval) {
            this.curEval.pvs.push(pvData);
            this.curEval.depth = Math.min(this.curEval.depth, depth);
        }
        if (multiPv === this.expectedPvs && this.curEval) {
            this.work.emit(this.curEval);
        }
    }
    start(w) {
        if (!this.stopped) {
            // TODO: Work is started by basically doing stop().then(() => start(w)).
            // There is a race condition where multiple callers are waiting for
            // completion of the same stop future, and so they will start work at
            // the same time.
            // This can lead to all kinds of issues, including deadlocks. Instead
            // we ignore all but the first request. The engine will show as loading
            // indefinitely. Until this is fixed, it is still better than a
            // possible deadlock.
            console.log('ceval: tried to start analysing before requesting stop');
            return;
        }
        this.work = w;
        this.curEval = null;
        this.stopped = null;
        this.expectedPvs = 1;
        if (this.opts.threads)
            this.setOption('Threads', this.opts.threads());
        if (this.opts.hashSize)
            this.setOption('Hash', this.opts.hashSize());
        this.setOption('MultiPV', this.work.multiPv);
        this.send(['position', 'fen', this.work.initialFen, 'moves'].concat(this.work.moves).join(' '));
        if (this.work.maxDepth >= 99)
            this.send('go depth 99');
        else
            this.send('go movetime 90000 depth ' + this.work.maxDepth);
    }
    stop() {
        if (!this.stopped) {
            this.work = null;
            this.stopped = defer();
            this.send('stop');
        }
        return this.stopped.promise;
    }
    isComputing() {
        return !this.stopped;
    }
}
exports.default = Protocol;
;
function defer() {
    const deferred = {};
    deferred.promise = new Promise(function (resolve, reject) {
        deferred.resolve = resolve;
        deferred.reject = reject;
    });
    return deferred;
}

},{"chess":129}],116:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const winningChances = require("./winningChances");
const common_1 = require("common");
const chess_1 = require("chess");
const snabbdom_1 = require("snabbdom");
const util_1 = require("chessops/util");
const fen_1 = require("chessops/fen");
const san_1 = require("chessops/san");
const variant_1 = require("chessops/variant");
let gaugeLast = 0;
const gaugeTicks = [...Array(8).keys()].map(i => snabbdom_1.h(i === 3 ? 'tick.zero' : 'tick', { attrs: { style: `height: ${(i + 1) * 12.5}%` } }));
function localEvalInfo(ctrl, evs) {
    const ceval = ctrl.getCeval(), trans = ctrl.trans;
    if (!evs.client)
        return [
            evs.server && ctrl.nextNodeBest() ? trans.noarg('usingServerAnalysis') : trans.noarg('loadingEngine'),
        ];
    const t = evs.client.cloud ? [
        trans('depthX', evs.client.depth || 0),
        snabbdom_1.h('span.cloud', { attrs: { title: trans.noarg('cloudAnalysis') } }, 'Cloud')
    ] : [
        trans('depthX', (evs.client.depth || 0) + '/' + evs.client.maxDepth)
    ];
    if (ceval.canGoDeeper())
        t.push(snabbdom_1.h('a.deeper', {
            attrs: {
                title: trans.noarg('goDeeper'),
                'data-icon': 'O'
            },
            hook: {
                insert: vnode => vnode.elm.addEventListener('click', () => {
                    ceval.goDeeper();
                    ceval.redraw();
                })
            }
        }));
    else if (!evs.client.cloud && evs.client.knps)
        t.push(', ' + Math.round(evs.client.knps) + ' knodes/s');
    return t;
}
function threatInfo(ctrl, threat) {
    if (!threat)
        return ctrl.trans.noarg('loadingEngine');
    let t = ctrl.trans('depthX', (threat.depth || 0) + '/' + threat.maxDepth);
    if (threat.knps)
        t += ', ' + Math.round(threat.knps) + ' knodes/s';
    return t;
}
function threatButton(ctrl) {
    if (ctrl.disableThreatMode && ctrl.disableThreatMode())
        return null;
    return snabbdom_1.h('a.show-threat', {
        class: {
            active: ctrl.threatMode(),
            hidden: !!ctrl.getNode().check
        },
        attrs: {
            'data-icon': '7',
            title: ctrl.trans.noarg('showThreat') + ' (x)'
        },
        hook: {
            insert: vnode => vnode.elm.addEventListener('click', ctrl.toggleThreatMode)
        }
    });
}
function engineName(ctrl) {
    const version = ctrl.engineName();
    return [
        snabbdom_1.h('span', version ? { attrs: { title: version } } : {}, ctrl.technology == 'wasmx' ? window.lichess.engineName : 'Stockfish 10+'),
        ctrl.technology == 'wasmx' ? snabbdom_1.h('span.native', { attrs: { title: 'Multi-threaded WebAssembly (experimental)' } }, 'wasmx') :
            (ctrl.technology == 'wasm' ? snabbdom_1.h('span.native', { attrs: { title: 'WebAssembly' } }, 'wasm') :
                snabbdom_1.h('span.asmjs', { attrs: { title: 'JavaScript fallback' } }, 'asmjs'))
    ];
}
const serverNodes = 4e6;
function getBestEval(evs) {
    const serverEv = evs.server, localEv = evs.client;
    if (!serverEv)
        return localEv;
    if (!localEv)
        return serverEv;
    // Prefer localEv if it exeeds fishnet node limit or finds a better mate.
    if (localEv.nodes > serverNodes ||
        (typeof localEv.mate !== 'undefined' && (typeof serverEv.mate === 'undefined' || Math.abs(localEv.mate) < Math.abs(serverEv.mate))))
        return localEv;
    return serverEv;
}
exports.getBestEval = getBestEval;
function renderGauge(ctrl) {
    if (ctrl.ongoing || !ctrl.showEvalGauge())
        return;
    let ev, bestEv = getBestEval(ctrl.currentEvals());
    if (bestEv) {
        ev = winningChances.povChances('white', bestEv);
        gaugeLast = ev;
    }
    else
        ev = gaugeLast;
    return snabbdom_1.h('div.eval-gauge', {
        class: {
            empty: ev === null,
            reverse: ctrl.getOrientation() === 'black'
        }
    }, [
        snabbdom_1.h('div.black', { attrs: { style: `height: ${100 - (ev + 1) * 50}%` } }),
        ...gaugeTicks
    ]);
}
exports.renderGauge = renderGauge;
function renderCeval(ctrl) {
    const instance = ctrl.getCeval(), trans = ctrl.trans;
    if (!instance.allowed() || !instance.possible || !ctrl.showComputer())
        return;
    const enabled = instance.enabled(), evs = ctrl.currentEvals(), threatMode = ctrl.threatMode(), threat = threatMode && ctrl.getNode().threat, bestEv = threat || getBestEval(evs);
    let pearl, percent;
    if (bestEv && typeof bestEv.cp !== 'undefined') {
        pearl = chess_1.renderEval(bestEv.cp);
        percent = evs.client ? Math.min(100, Math.round(100 * evs.client.depth / (evs.client.maxDepth || instance.effectiveMaxDepth()))) : 0;
    }
    else if (bestEv && common_1.defined(bestEv.mate)) {
        pearl = '#' + bestEv.mate;
        percent = 100;
    }
    else if (ctrl.gameOver()) {
        pearl = '-';
        percent = 0;
    }
    else {
        pearl = enabled ? snabbdom_1.h('i.ddloader') : snabbdom_1.h('i');
        percent = 0;
    }
    if (threatMode) {
        if (threat)
            percent = Math.min(100, Math.round(100 * threat.depth / threat.maxDepth));
        else
            percent = 0;
    }
    const progressBar = enabled ? snabbdom_1.h('div.bar', snabbdom_1.h('span', {
        class: { threat: threatMode },
        attrs: { style: `width: ${percent}%` },
        hook: {
            postpatch: (old, vnode) => {
                if (old.data.percent > percent || !!old.data.threatMode != threatMode) {
                    const el = vnode.elm;
                    const p = el.parentNode;
                    p.removeChild(el);
                    p.appendChild(el);
                }
                vnode.data.percent = percent;
                vnode.data.threatMode = threatMode;
            }
        }
    })) : null;
    const body = enabled ? [
        snabbdom_1.h('pearl', [pearl]),
        snabbdom_1.h('div.engine', [
            ...(threatMode ? [trans.noarg('showThreat')] : engineName(instance)),
            snabbdom_1.h('span.info', ctrl.gameOver() ? [trans.noarg('gameOver')] :
                (threatMode ? [threatInfo(ctrl, threat)] : localEvalInfo(ctrl, evs)))
        ])
    ] : [
        pearl ? snabbdom_1.h('pearl', [pearl]) : null,
        snabbdom_1.h('help', [
            ...engineName(instance),
            snabbdom_1.h('br'),
            trans.noarg('inLocalBrowser')
        ])
    ];
    const switchButton = ctrl.mandatoryCeval && ctrl.mandatoryCeval() ? null : snabbdom_1.h('div.switch', {
        attrs: { title: trans.noarg('toggleLocalEvaluation') + ' (l)' }
    }, [
        snabbdom_1.h('input#analyse-toggle-ceval.cmn-toggle.cmn-toggle--subtle', {
            attrs: {
                type: 'checkbox',
                checked: enabled
            },
            hook: {
                insert: vnode => vnode.elm.addEventListener('change', ctrl.toggleCeval)
            }
        }),
        snabbdom_1.h('label', { attrs: { 'for': 'analyse-toggle-ceval' } })
    ]);
    return snabbdom_1.h('div.ceval' + (enabled ? '.enabled' : ''), {
        class: {
            computing: percent < 100 && instance.isComputing()
        }
    }, [
        progressBar,
        ...body,
        threatButton(ctrl),
        switchButton
    ]);
}
exports.renderCeval = renderCeval;
function getElFen(el) {
    return el.getAttribute('data-fen');
}
function getElUci(e) {
    return $(e.target).closest('div.pv').attr('data-uci');
}
function checkHover(el, instance) {
    window.lichess.requestIdleCallback(() => {
        instance.setHovering(getElFen(el), $(el).find('div.pv:hover').attr('data-uci'));
    });
}
function renderPvs(ctrl) {
    const instance = ctrl.getCeval();
    if (!instance.allowed() || !instance.possible || !instance.enabled())
        return;
    const multiPv = parseInt(instance.multiPv()), node = ctrl.getNode(), setup = fen_1.parseFen(node.fen).unwrap();
    let pvs, threat = false;
    if (ctrl.threatMode() && node.threat) {
        pvs = node.threat.pvs;
        threat = true;
    }
    else if (node.ceval)
        pvs = node.ceval.pvs;
    else
        pvs = [];
    if (threat)
        setup.turn = util_1.opposite(setup.turn);
    const pos = variant_1.setupPosition(chess_1.variantToRules(instance.variant.key), setup);
    return snabbdom_1.h('div.pv_box', {
        attrs: { 'data-fen': node.fen },
        hook: {
            insert: vnode => {
                const el = vnode.elm;
                el.addEventListener('mouseover', (e) => {
                    instance.setHovering(getElFen(el), getElUci(e));
                });
                el.addEventListener('mouseout', () => {
                    instance.setHovering(getElFen(el));
                });
                el.addEventListener('mousedown', (e) => {
                    const uci = getElUci(e);
                    if (uci)
                        ctrl.playUci(uci);
                });
                checkHover(el, instance);
            },
            postpatch: (_, vnode) => checkHover(vnode.elm, instance)
        }
    }, [...Array(multiPv).keys()].map(function (i) {
        if (!pvs[i])
            return snabbdom_1.h('div.pv');
        return snabbdom_1.h('div.pv', threat ? {} : {
            attrs: { 'data-uci': pvs[i].moves[0] }
        }, [
            multiPv > 1 ? snabbdom_1.h('strong', common_1.defined(pvs[i].mate) ? ('#' + pvs[i].mate) : chess_1.renderEval(pvs[i].cp)) : null,
            snabbdom_1.h('span', pos.unwrap(pos => san_1.makeSanVariation(pos, pvs[i].moves.slice(0, 12).map(m => util_1.parseUci(m))), _ => '--'))
        ]);
    }));
}
exports.renderPvs = renderPvs;

},{"./winningChances":117,"chess":129,"chessops/fen":23,"chessops/san":24,"chessops/util":28,"chessops/variant":29,"common":131,"snabbdom":35}],117:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function toPov(color, diff) {
    return color === 'white' ? diff : -diff;
}
/**
 * https://graphsketch.com/?eqn1_color=1&eqn1_eqn=100+*+%282+%2F+%281+%2B+exp%28-0.005+*+x%29%29+-+1%29&eqn2_color=2&eqn2_eqn=100+*+%282+%2F+%281+%2B+exp%28-0.004+*+x%29%29+-+1%29&eqn3_color=3&eqn3_eqn=&eqn4_color=4&eqn4_eqn=&eqn5_color=5&eqn5_eqn=&eqn6_color=6&eqn6_eqn=&x_min=-1000&x_max=1000&y_min=-100&y_max=100&x_tick=100&y_tick=10&x_label_freq=2&y_label_freq=2&do_grid=0&do_grid=1&bold_labeled_lines=0&bold_labeled_lines=1&line_width=4&image_w=850&image_h=525
 */
function rawWinningChances(cp) {
    return 2 / (1 + Math.exp(-0.004 * cp)) - 1;
}
function cpWinningChances(cp) {
    return rawWinningChances(Math.min(Math.max(-1000, cp), 1000));
}
function mateWinningChances(mate) {
    var cp = (21 - Math.min(10, Math.abs(mate))) * 100;
    var signed = cp * (mate > 0 ? 1 : -1);
    return rawWinningChances(signed);
}
function evalWinningChances(ev) {
    return typeof ev.mate !== 'undefined' ? mateWinningChances(ev.mate) : cpWinningChances(ev.cp);
}
// winning chances for a color
// 1  infinitely winning
// -1 infinitely losing
function povChances(color, ev) {
    return toPov(color, evalWinningChances(ev));
}
exports.povChances = povChances;
// computes the difference, in winning chances, between two evaluations
// 1  = e1 is infinately better than e2
// -1 = e1 is infinately worse  than e2
function povDiff(color, e1, e2) {
    return (povChances(color, e1) - povChances(color, e2)) / 2;
}
exports.povDiff = povDiff;

},{}],118:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const preset_1 = require("./preset");
const note_1 = require("./note");
const moderation_1 = require("./moderation");
const common_1 = require("common");
const li = window.lichess;
function default_1(opts, redraw) {
    const data = opts.data;
    data.domVersion = 1; // increment to force redraw
    const maxLines = 200;
    const maxLinesDrop = 50; // how many lines to drop at once
    const palantir = {
        instance: undefined,
        loaded: false,
        enabled: common_1.prop(!!data.palantir)
    };
    const allTabs = ['discussion'];
    if (opts.noteId)
        allTabs.push('note');
    if (opts.plugin)
        allTabs.push(opts.plugin.tab.key);
    const tabStorage = li.storage.make('chat.tab'), storedTab = tabStorage.get();
    let moderation;
    const vm = {
        tab: allTabs.find(tab => tab === storedTab) || allTabs[0],
        enabled: opts.alwaysEnabled || !li.storage.get('nochat'),
        placeholderKey: 'talkInChat',
        loading: false,
        timeout: opts.timeout,
        writeable: opts.writeable
    };
    /* If discussion is disabled, and we have another chat tab,
     * then select that tab over discussion */
    if (allTabs.length > 1 && vm.tab === 'discussion' && li.storage.get('nochat'))
        vm.tab = allTabs[1];
    const post = function (text) {
        text = text.trim();
        if (!text)
            return;
        if (text.length > 140) {
            alert('Max length: 140 chars. ' + text.length + ' chars used.');
            return;
        }
        li.pubsub.emit('socket.send', 'talk', text);
    };
    const onTimeout = function (userId) {
        data.lines.forEach(l => {
            if (l.u && l.u.toLowerCase() == userId)
                l.d = true;
        });
        if (userId == data.userId)
            vm.timeout = true;
        data.domVersion++;
        redraw();
    };
    const onReinstate = function (userId) {
        if (userId == data.userId) {
            vm.timeout = false;
            redraw();
        }
    };
    const onMessage = function (line) {
        data.lines.push(line);
        const nb = data.lines.length;
        if (nb > maxLines) {
            data.lines.splice(0, nb - maxLines + maxLinesDrop);
            data.domVersion++;
        }
        redraw();
    };
    const onWriteable = function (v) {
        vm.writeable = v;
        redraw();
    };
    const onPermissions = function (obj) {
        let p;
        for (p in obj)
            opts.permissions[p] = obj[p];
        instanciateModeration();
        redraw();
    };
    const trans = li.trans(opts.i18n);
    function canMod() {
        return opts.permissions.timeout || opts.permissions.local;
    }
    function instanciateModeration() {
        moderation = canMod() ? moderation_1.moderationCtrl({
            reasons: opts.timeoutReasons || ([{ key: 'other', name: 'Inappropriate behavior' }]),
            permissions: opts.permissions,
            redraw
        }) : undefined;
        if (canMod())
            opts.loadCss('chat.mod');
    }
    instanciateModeration();
    const note = opts.noteId ? note_1.noteCtrl({
        id: opts.noteId,
        trans,
        redraw
    }) : undefined;
    const preset = preset_1.presetCtrl({
        initialGroup: opts.preset,
        post,
        redraw
    });
    const subs = [
        ['socket.in.message', onMessage],
        ['socket.in.chat_timeout', onTimeout],
        ['socket.in.chat_reinstate', onReinstate],
        ['chat.writeable', onWriteable],
        ['chat.permissions', onPermissions],
        ['palantir.toggle', palantir.enabled]
    ];
    subs.forEach(([eventName, callback]) => li.pubsub.on(eventName, callback));
    const destroy = () => {
        subs.forEach(([eventName, callback]) => li.pubsub.off(eventName, callback));
    };
    const emitEnabled = () => li.pubsub.emit('chat.enabled', vm.enabled);
    emitEnabled();
    return {
        data,
        opts,
        vm,
        allTabs,
        setTab(t) {
            vm.tab = t;
            tabStorage.set(t);
            // It's a lame way to do it. Give me a break.
            if (t === 'discussion')
                li.requestIdleCallback(() => $('.mchat__say').focus());
            redraw();
        },
        moderation: () => moderation,
        note,
        preset,
        post,
        trans,
        plugin: opts.plugin,
        setEnabled(v) {
            vm.enabled = v;
            emitEnabled();
            if (!v)
                li.storage.set('nochat', '1');
            else
                li.storage.remove('nochat');
            redraw();
        },
        redraw,
        palantir,
        destroy
    };
}
exports.default = default_1;
;

},{"./moderation":122,"./note":123,"./preset":124,"common":131}],119:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const spam = require("./spam");
const enhance = require("./enhance");
const preset_1 = require("./preset");
const moderation_1 = require("./moderation");
const util_1 = require("./util");
const xhr_1 = require("./xhr");
const whisperRegex = /^\/w(?:hisper)?\s/;
function default_1(ctrl) {
    if (!ctrl.vm.enabled)
        return [];
    const scrollCb = (vnode) => {
        const el = vnode.elm;
        if (ctrl.data.lines.length > 5) {
            const autoScroll = (el.scrollTop === 0 || (el.scrollTop > (el.scrollHeight - el.clientHeight - 100)));
            if (autoScroll) {
                el.scrollTop = 999999;
                setTimeout((_) => el.scrollTop = 999999, 300);
            }
        }
    }, mod = ctrl.moderation();
    const vnodes = [
        snabbdom_1.h('ol.mchat__messages.chat-v-' + ctrl.data.domVersion, {
            attrs: {
                role: 'log',
                'aria-live': 'polite',
                'aria-atomic': false
            },
            hook: {
                insert(vnode) {
                    const $el = $(vnode.elm).on('click', 'a.jump', (e) => {
                        window.lichess.pubsub.emit('jump', e.target.getAttribute('data-ply'));
                    });
                    if (mod)
                        $el.on('click', '.mod', (e) => {
                            mod.open(e.target.getAttribute('data-username').split(' ')[0]);
                        });
                    else
                        $el.on('click', '.flag', (e) => report(ctrl, e.target.parentNode));
                    scrollCb(vnode);
                },
                postpatch: (_, vnode) => scrollCb(vnode)
            }
        }, selectLines(ctrl).map(line => renderLine(ctrl, line))),
        renderInput(ctrl)
    ];
    const presets = preset_1.presetView(ctrl.preset);
    if (presets)
        vnodes.push(presets);
    return vnodes;
}
exports.default = default_1;
function renderInput(ctrl) {
    if (!ctrl.vm.writeable)
        return;
    if ((ctrl.data.loginRequired && !ctrl.data.userId) || ctrl.data.restricted)
        return snabbdom_1.h('input.mchat__say', {
            attrs: {
                placeholder: ctrl.trans('loginToChat'),
                disabled: true
            }
        });
    let placeholder;
    if (ctrl.vm.timeout)
        placeholder = ctrl.trans('youHaveBeenTimedOut');
    else if (ctrl.opts.blind)
        placeholder = 'Chat';
    else
        placeholder = ctrl.trans.noarg(ctrl.vm.placeholderKey);
    return snabbdom_1.h('input.mchat__say', {
        attrs: {
            placeholder,
            autocomplete: 'off',
            maxlength: 140,
            disabled: ctrl.vm.timeout || !ctrl.vm.writeable
        },
        hook: {
            insert(vnode) {
                setupHooks(ctrl, vnode.elm);
            }
        }
    });
}
let mouchListener;
const setupHooks = (ctrl, chatEl) => {
    chatEl.addEventListener('keypress', (e) => setTimeout(() => {
        const el = e.target, txt = el.value, pub = ctrl.opts.public;
        if (e.which == 10 || e.which == 13) {
            if (txt === '')
                $('.keyboard-move input').focus();
            else {
                spam.report(txt);
                if (pub && spam.hasTeamUrl(txt))
                    alert("Please don't advertise teams in the chat.");
                else
                    ctrl.post(txt);
                el.value = '';
                if (!pub)
                    el.classList.remove('whisper');
            }
        }
        else {
            el.removeAttribute('placeholder');
            if (!pub)
                el.classList.toggle('whisper', !!txt.match(whisperRegex));
        }
    }));
    window.Mousetrap.bind('c', () => {
        chatEl.focus();
        return false;
    });
    window.Mousetrap(chatEl).bind('esc', () => chatEl.blur());
    // Ensure clicks remove chat focus.
    // See ornicar/chessground#109
    const mouchEvents = ['touchstart', 'mousedown'];
    if (mouchListener)
        mouchEvents.forEach(event => document.body.removeEventListener(event, mouchListener, { capture: true }));
    mouchListener = (e) => {
        if (!e.shiftKey && e.buttons !== 2 && e.button !== 2)
            chatEl.blur();
    };
    chatEl.onfocus = () => mouchEvents.forEach(event => document.body.addEventListener(event, mouchListener, { passive: true, capture: true }));
    chatEl.onblur = () => mouchEvents.forEach(event => document.body.removeEventListener(event, mouchListener, { capture: true }));
};
function sameLines(l1, l2) {
    return l1.d && l2.d && l1.u === l2.u;
}
function selectLines(ctrl) {
    let prev, ls = [];
    ctrl.data.lines.forEach(line => {
        if (!line.d &&
            (!prev || !sameLines(prev, line)) &&
            (!line.r || (line.u || '').toLowerCase() == ctrl.data.userId) &&
            !spam.skip(line.t))
            ls.push(line);
        prev = line;
    });
    return ls;
}
function updateText(parseMoves) {
    return (oldVnode, vnode) => {
        if (vnode.data.lichessChat !== oldVnode.data.lichessChat) {
            vnode.elm.innerHTML = enhance.enhance(vnode.data.lichessChat, parseMoves);
        }
    };
}
function renderText(t, parseMoves) {
    if (enhance.isMoreThanText(t)) {
        const hook = updateText(parseMoves);
        return snabbdom_1.h('t', {
            lichessChat: t,
            hook: {
                create: hook,
                update: hook
            }
        });
    }
    return snabbdom_1.h('t', t);
}
function report(ctrl, line) {
    const userA = line.querySelector('a.user-link');
    const text = line.querySelector('t').innerText;
    if (userA && confirm(`Report "${text}" to moderators?`))
        xhr_1.flag(ctrl.data.resourceId, userA.href.split('/')[4], text);
}
function renderLine(ctrl, line) {
    const textNode = renderText(line.t, ctrl.opts.parseMoves);
    if (line.u === 'lichess')
        return snabbdom_1.h('li.system', textNode);
    if (line.c)
        return snabbdom_1.h('li', [
            snabbdom_1.h('span.color', '[' + line.c + ']'),
            textNode
        ]);
    const userNode = snabbdom_1.thunk('a', line.u, util_1.userLink, [line.u, line.title]);
    return snabbdom_1.h('li', {}, ctrl.moderation() ? [
        line.u ? moderation_1.lineAction(line.u) : null,
        userNode,
        textNode
    ] : [
        ctrl.data.userId && line.u && ctrl.data.userId != line.u ? snabbdom_1.h('i.flag', {
            attrs: {
                'data-icon': '!',
                title: 'Report'
            }
        }) : null,
        userNode,
        textNode
    ]);
}

},{"./enhance":120,"./moderation":122,"./preset":124,"./spam":125,"./util":126,"./xhr":128,"snabbdom":35}],120:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function enhance(text, parseMoves) {
    const escaped = window.lichess.escapeHtml(text);
    const linked = autoLink(escaped);
    const plied = parseMoves && linked === escaped ? addPlies(linked) : linked;
    return plied;
}
exports.enhance = enhance;
const moreThanTextPattern = /[&<>"@]/;
const possibleLinkPattern = /\.\w/;
function isMoreThanText(str) {
    return moreThanTextPattern.test(str) || possibleLinkPattern.test(str);
}
exports.isMoreThanText = isMoreThanText;
const linkPattern = /\b(https?:\/\/|lichess\.org\/)[-–—\w+&'@#\/%?=()~|!:,.;]+[\w+&@#\/%=~|]/gi;
function linkReplace(url, scheme) {
    if (url.includes('&quot;'))
        return url;
    const fullUrl = scheme === 'lichess.org/' ? 'https://' + url : url;
    const minUrl = url.replace(/^https:\/\//, '');
    return '<a target="_blank" rel="nofollow" href="' + fullUrl + '">' + minUrl + '</a>';
}
const userPattern = /(^|[^\w@#/])@([\w-]{2,})/g;
const pawnDropPattern = /^[a-h][2-7]$/;
function userLinkReplace(orig, prefix, user) {
    if (user.length > 20 || user.match(pawnDropPattern))
        return orig;
    return prefix + '<a href="/@/' + user + '">@' + user + "</a>";
}
function autoLink(html) {
    return html.replace(userPattern, userLinkReplace).replace(linkPattern, linkReplace);
}
const movePattern = /\b(\d+)\s*(\.+)\s*(?:[o0-]+[o0]|[NBRQKP]?[a-h]?[1-8]?[x@]?[a-z][1-8](?:=[NBRQK])?)\+?\#?[!\?=]{0,5}/gi;
function moveReplacer(match, turn, dots) {
    if (turn < 1 || turn > 200)
        return match;
    const ply = turn * 2 - (dots.length > 1 ? 0 : 1);
    return '<a class="jump" data-ply="' + ply + '">' + match + '</a>';
}
function addPlies(html) {
    return html.replace(movePattern, moveReplacer);
}

},{}],121:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const ctrl_1 = require("./ctrl");
const view_1 = require("./view");
const class_1 = require("snabbdom/modules/class");
const attributes_1 = require("snabbdom/modules/attributes");
function LichessChat(element, opts) {
    const patch = snabbdom_1.init([class_1.default, attributes_1.default]);
    let vnode, ctrl;
    function redraw() {
        vnode = patch(vnode, view_1.default(ctrl));
    }
    ctrl = ctrl_1.default(opts, redraw);
    const blueprint = view_1.default(ctrl);
    element.innerHTML = '';
    vnode = patch(element, blueprint);
    return ctrl;
}
exports.default = LichessChat;
;

},{"./ctrl":118,"./view":127,"snabbdom":35,"snabbdom/modules/attributes":33,"snabbdom/modules/class":34}],122:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const xhr_1 = require("./xhr");
const util_1 = require("./util");
function moderationCtrl(opts) {
    let data;
    let loading = false;
    const open = (username) => {
        if (opts.permissions.timeout) {
            loading = true;
            xhr_1.userModInfo(username).then(d => {
                data = d;
                loading = false;
                opts.redraw();
            });
        }
        else {
            data = {
                id: username,
                username
            };
        }
        opts.redraw();
    };
    const close = () => {
        data = undefined;
        loading = false;
        opts.redraw();
    };
    return {
        loading: () => loading,
        data: () => data,
        reasons: opts.reasons,
        permissions: () => opts.permissions,
        open,
        close,
        timeout(reason) {
            data && window.lichess.pubsub.emit('socket.send', 'timeout', {
                userId: data.id,
                reason: reason.key
            });
            close();
            opts.redraw();
        },
        shadowban() {
            loading = true;
            data && $.post('/mod/' + data.id + '/troll/true').then(() => data && open(data.username));
            opts.redraw();
        }
    };
}
exports.moderationCtrl = moderationCtrl;
function lineAction(username) {
    return snabbdom_1.h('i.mod', {
        attrs: {
            'data-icon': '',
            'data-username': username,
            title: 'Moderation'
        }
    });
}
exports.lineAction = lineAction;
function moderationView(ctrl) {
    if (!ctrl)
        return;
    if (ctrl.loading())
        return [snabbdom_1.h('div.loading', util_1.spinner())];
    const data = ctrl.data();
    if (!data)
        return;
    const perms = ctrl.permissions();
    const infos = data.history ? snabbdom_1.h('div.infos.block', [
        window.lichess.numberFormat(data.games || 0) + ' games',
        data.troll ? 'TROLL' : undefined,
        data.engine ? 'ENGINE' : undefined,
        data.booster ? 'BOOSTER' : undefined
    ].map(t => t && snabbdom_1.h('span', t)).concat([
        snabbdom_1.h('a', {
            attrs: {
                href: '/@/' + data.username + '?mod'
            }
        }, 'profile')
    ]).concat(perms.shadowban ? [
        snabbdom_1.h('a', {
            attrs: {
                href: '/mod/' + data.username + '/communication'
            }
        }, 'coms')
    ] : [])) : undefined;
    const timeout = perms.timeout ? snabbdom_1.h('div.timeout.block', [
        snabbdom_1.h('strong', 'Timeout 10 minutes for'),
        ...ctrl.reasons.map(r => {
            return snabbdom_1.h('a.text', {
                attrs: { 'data-icon': 'p' },
                hook: util_1.bind('click', () => ctrl.timeout(r))
            }, r.name);
        }),
        ...((data.troll || !perms.shadowban) ? [] : [snabbdom_1.h('div.shadowban', [
                'Or ',
                snabbdom_1.h('button.button.button-red.button-empty', {
                    hook: util_1.bind('click', ctrl.shadowban)
                }, 'shadowban')
            ])])
    ]) : snabbdom_1.h('div.timeout.block', [
        snabbdom_1.h('strong', 'Moderation'),
        snabbdom_1.h('a.text', {
            attrs: { 'data-icon': 'p' },
            hook: util_1.bind('click', () => ctrl.timeout(ctrl.reasons[0]))
        }, 'Timeout 10 minutes')
    ]);
    const history = data.history ? snabbdom_1.h('div.history.block', [
        snabbdom_1.h('strong', 'Timeout history'),
        snabbdom_1.h('table', snabbdom_1.h('tbody.slist', {
            hook: {
                insert: () => window.lichess.pubsub.emit('content_loaded')
            }
        }, data.history.map(function (e) {
            return snabbdom_1.h('tr', [
                snabbdom_1.h('td.reason', e.reason),
                snabbdom_1.h('td.mod', e.mod),
                snabbdom_1.h('td', snabbdom_1.h('time.timeago', {
                    attrs: { datetime: e.date }
                }))
            ]);
        })))
    ]) : undefined;
    return [
        snabbdom_1.h('div.top', { key: 'mod-' + data.id }, [
            snabbdom_1.h('span.text', {
                attrs: { 'data-icon': '' },
            }, [util_1.userLink(data.username)]),
            snabbdom_1.h('a', {
                attrs: { 'data-icon': 'L' },
                hook: util_1.bind('click', ctrl.close)
            })
        ]),
        snabbdom_1.h('div.mchat__content.moderation', [
            infos,
            timeout,
            history
        ])
    ];
}
exports.moderationView = moderationView;
;

},{"./util":126,"./xhr":128,"snabbdom":35}],123:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const xhr = require("./xhr");
const util_1 = require("./util");
function noteCtrl(opts) {
    let text;
    const doPost = window.lichess.debounce(() => {
        xhr.setNote(opts.id, text);
    }, 1000);
    return {
        id: opts.id,
        trans: opts.trans,
        text: () => text,
        fetch() {
            xhr.getNote(opts.id).then(t => {
                text = t || '';
                opts.redraw();
            });
        },
        post(t) {
            text = t;
            doPost();
        }
    };
}
exports.noteCtrl = noteCtrl;
function noteView(ctrl) {
    const text = ctrl.text();
    if (text == undefined)
        return snabbdom_1.h('div.loading', {
            hook: {
                insert: ctrl.fetch
            },
        }, [util_1.spinner()]);
    return snabbdom_1.h('textarea', {
        attrs: {
            placeholder: ctrl.trans('typePrivateNotesHere')
        },
        hook: {
            insert(vnode) {
                const $el = $(vnode.elm);
                $el.val(text).on('change keyup paste', () => {
                    ctrl.post($el.val());
                });
            }
        }
    });
}
exports.noteView = noteView;

},{"./util":126,"./xhr":128,"snabbdom":35}],124:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const util_1 = require("./util");
const groups = {
    start: [
        'hi/Hello', 'gl/Good luck', 'hf/Have fun!', 'u2/You too!'
    ].map(splitIt),
    end: [
        'gg/Good game', 'wp/Well played', 'ty/Thank you', 'gtg/I\'ve got to go', 'bye/Bye!'
    ].map(splitIt)
};
function presetCtrl(opts) {
    let group = opts.initialGroup;
    let said = [];
    return {
        group: () => group,
        said: () => said,
        setGroup(p) {
            if (p !== group) {
                group = p;
                if (!p)
                    said = [];
                opts.redraw();
            }
        },
        post(preset) {
            if (!group)
                return;
            const sets = groups[group];
            if (!sets)
                return;
            if (said.includes(preset.key))
                return;
            opts.post(preset.text);
            said.push(preset.key);
        }
    };
}
exports.presetCtrl = presetCtrl;
function presetView(ctrl) {
    const group = ctrl.group();
    if (!group)
        return;
    const sets = groups[group];
    const said = ctrl.said();
    return (sets && said.length < 2) ? snabbdom_1.h('div.mchat__presets', sets.map((p) => {
        const disabled = said.includes(p.key);
        return snabbdom_1.h('span', {
            class: {
                disabled
            },
            attrs: {
                title: p.text,
                disabled
            },
            hook: util_1.bind('click', () => { !disabled && ctrl.post(p); })
        }, p.key);
    })) : undefined;
}
exports.presetView = presetView;
function splitIt(s) {
    const parts = s.split('/');
    return {
        key: parts[0],
        text: parts[1]
    };
}

},{"./util":126,"snabbdom":35}],125:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function skip(txt) {
    return analyse(txt) && window.lichess.storage.get('chat-spam') != '1';
}
exports.skip = skip;
function hasTeamUrl(txt) {
    return !!txt.match(teamUrlRegex);
}
exports.hasTeamUrl = hasTeamUrl;
function report(txt) {
    if (analyse(txt)) {
        $.post('/jslog/' + window.location.href.substr(-12) + '?n=spam');
        window.lichess.storage.set('chat-spam', '1');
    }
}
exports.report = report;
const spamRegex = new RegExp([
    'xcamweb.com',
    '(^|[^i])chess-bot',
    'chess-cheat',
    'coolteenbitch',
    'letcafa.webcam',
    'tinyurl.com/',
    'wooga.info/',
    'bit.ly/',
    'wbt.link/',
    'eb.by/',
    '001.rs/',
    'shr.name/',
    'u.to/',
    '.3-a.net',
    '.ssl443.org',
    '.ns02.us',
    '.myftp.info',
    '.flinkup.com',
    '.serveusers.com',
    'badoogirls.com',
    'hide.su',
    'wyon.de',
    'sexdatingcz.club'
].map(url => {
    return url.replace(/\./g, '\\.').replace(/\//g, '\\/');
}).join('|'));
function analyse(txt) {
    return !!txt.match(spamRegex);
}
const teamUrlRegex = /lichess\.org\/team\//;

},{}],126:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
function userLink(u, title) {
    const trunc = u.substring(0, 14);
    return snabbdom_1.h('a', {
        // can't be inlined because of thunks
        class: {
            'user-link': true,
            ulpt: true
        },
        attrs: {
            href: '/@/' + u
        }
    }, title ? [
        snabbdom_1.h('span.title', title == 'BOT' ? { attrs: { 'data-bot': true } } : {}, title), trunc
    ] : [trunc]);
}
exports.userLink = userLink;
function spinner() {
    return snabbdom_1.h('div.spinner', [
        snabbdom_1.h('svg', { attrs: { viewBox: '0 0 40 40' } }, [
            snabbdom_1.h('circle', {
                attrs: { cx: 20, cy: 20, r: 18, fill: 'none' }
            })
        ])
    ]);
}
exports.spinner = spinner;
function bind(eventName, f) {
    return {
        insert: (vnode) => {
            vnode.elm.addEventListener(eventName, f);
        }
    };
}
exports.bind = bind;

},{"snabbdom":35}],127:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const discussion_1 = require("./discussion");
const note_1 = require("./note");
const moderation_1 = require("./moderation");
const util_1 = require("./util");
function default_1(ctrl) {
    const mod = ctrl.moderation();
    return snabbdom_1.h('section.mchat' + (ctrl.opts.alwaysEnabled ? '' : '.mchat-optional'), {
        class: {
            'mchat-mod': !!mod
        },
        hook: {
            destroy: ctrl.destroy
        }
    }, moderation_1.moderationView(mod) || normalView(ctrl));
}
exports.default = default_1;
function renderPalantir(ctrl) {
    const p = ctrl.palantir;
    if (!p.enabled())
        return;
    return p.instance ? p.instance.render(snabbdom_1.h) : snabbdom_1.h('div.mchat__tab.palantir.palantir-slot', {
        attrs: {
            'data-icon': '',
            title: 'Voice chat'
        },
        hook: util_1.bind('click', () => {
            if (!p.loaded) {
                p.loaded = true;
                const li = window.lichess;
                li.loadScript('javascripts/vendor/peerjs.min.js').then(() => {
                    li.loadScript(li.compiledScript('palantir')).then(() => {
                        p.instance = window.Palantir.palantir({
                            uid: ctrl.data.userId,
                            redraw: ctrl.redraw
                        });
                        ctrl.redraw();
                    });
                });
            }
        })
    });
}
function normalView(ctrl) {
    const active = ctrl.vm.tab;
    return [
        snabbdom_1.h('div.mchat__tabs.nb_' + ctrl.allTabs.length, [
            ...ctrl.allTabs.map(t => renderTab(ctrl, t, active)),
            renderPalantir(ctrl)
        ]),
        snabbdom_1.h('div.mchat__content.' + active, (active === 'note' && ctrl.note) ? [note_1.noteView(ctrl.note)] : (ctrl.plugin && active === ctrl.plugin.tab.key ? [ctrl.plugin.view()] : discussion_1.default(ctrl)))
    ];
}
function renderTab(ctrl, tab, active) {
    return snabbdom_1.h('div.mchat__tab.' + tab, {
        class: { 'mchat__tab-active': tab === active },
        hook: util_1.bind('click', () => ctrl.setTab(tab))
    }, tabName(ctrl, tab));
}
function tabName(ctrl, tab) {
    if (tab === 'discussion')
        return [
            snabbdom_1.h('span', ctrl.data.name),
            ctrl.opts.alwaysEnabled ? undefined : snabbdom_1.h('input', {
                attrs: {
                    type: 'checkbox',
                    title: ctrl.trans.noarg('toggleTheChat'),
                    checked: ctrl.vm.enabled
                },
                hook: util_1.bind('change', (e) => {
                    ctrl.setEnabled(e.target.checked);
                })
            })
        ];
    if (tab === 'note')
        return [snabbdom_1.h('span', ctrl.trans.noarg('notes'))];
    if (ctrl.plugin && tab === ctrl.plugin.tab.key)
        return [snabbdom_1.h('span', ctrl.plugin.tab.name)];
    return [];
}

},{"./discussion":119,"./moderation":122,"./note":123,"./util":126,"snabbdom":35}],128:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function userModInfo(username) {
    return $.get('/mod/chat-user/' + username);
}
exports.userModInfo = userModInfo;
function flag(resource, username, text) {
    return $.post('/report/flag', { username, resource, text });
}
exports.flag = flag;
function getNote(id) {
    return $.get(noteUrl(id));
}
exports.getNote = getNote;
function setNote(id, text) {
    return $.post(noteUrl(id), { text });
}
exports.setNote = setNote;
function noteUrl(id) {
    return `/${id}/note`;
}

},{}],129:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const piotr_1 = require("./piotr");
exports.piotr = piotr_1.default;
exports.initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
function fixCrazySan(san) {
    return san[0] === 'P' ? san.slice(1) : san;
}
exports.fixCrazySan = fixCrazySan;
function decomposeUci(uci) {
    return [uci.slice(0, 2), uci.slice(2, 4), uci.slice(4, 5)];
}
exports.decomposeUci = decomposeUci;
function renderEval(e) {
    e = Math.max(Math.min(Math.round(e / 10) / 10, 99), -99);
    return (e > 0 ? '+' : '') + e;
}
exports.renderEval = renderEval;
function readDests(lines) {
    if (typeof lines === 'undefined')
        return null;
    const dests = {};
    if (lines)
        lines.split(' ').forEach(line => {
            dests[piotr_1.default[line[0]]] = line.slice(1).split('').map(c => piotr_1.default[c]);
        });
    return dests;
}
exports.readDests = readDests;
function readDrops(line) {
    if (typeof line === 'undefined' || line === null)
        return null;
    return line.match(/.{2}/g) || [];
}
exports.readDrops = readDrops;
exports.roleToSan = {
    pawn: 'P',
    knight: 'N',
    bishop: 'B',
    rook: 'R',
    queen: 'Q',
    king: 'K'
};
exports.sanToRole = {
    P: 'pawn',
    N: 'knight',
    B: 'bishop',
    R: 'rook',
    Q: 'queen',
    K: 'king'
};
function variantToRules(variant) {
    switch (variant) {
        case 'standard':
        case 'chess960':
        case 'fromPosition':
            return 'chess';
        case 'threeCheck':
            return '3check';
        case 'kingOfTheHill':
            return 'kingofthehill';
        case 'racingKings':
            return 'racingkings';
        default:
            return variant;
    }
}
exports.variantToRules = variantToRules;

},{"./piotr":130}],130:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const piotr = {
    'a': 'a1',
    'b': 'b1',
    'c': 'c1',
    'd': 'd1',
    'e': 'e1',
    'f': 'f1',
    'g': 'g1',
    'h': 'h1',
    'i': 'a2',
    'j': 'b2',
    'k': 'c2',
    'l': 'd2',
    'm': 'e2',
    'n': 'f2',
    'o': 'g2',
    'p': 'h2',
    'q': 'a3',
    'r': 'b3',
    's': 'c3',
    't': 'd3',
    'u': 'e3',
    'v': 'f3',
    'w': 'g3',
    'x': 'h3',
    'y': 'a4',
    'z': 'b4',
    'A': 'c4',
    'B': 'd4',
    'C': 'e4',
    'D': 'f4',
    'E': 'g4',
    'F': 'h4',
    'G': 'a5',
    'H': 'b5',
    'I': 'c5',
    'J': 'd5',
    'K': 'e5',
    'L': 'f5',
    'M': 'g5',
    'N': 'h5',
    'O': 'a6',
    'P': 'b6',
    'Q': 'c6',
    'R': 'd6',
    'S': 'e6',
    'T': 'f6',
    'U': 'g6',
    'V': 'h6',
    'W': 'a7',
    'X': 'b7',
    'Y': 'c7',
    'Z': 'd7',
    '0': 'e7',
    '1': 'f7',
    '2': 'g7',
    '3': 'h7',
    '4': 'a8',
    '5': 'b8',
    '6': 'c8',
    '7': 'd8',
    '8': 'e8',
    '9': 'f8',
    '!': 'g8',
    '?': 'h8'
};
exports.default = piotr;

},{}],131:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function defined(v) {
    return typeof v !== 'undefined';
}
exports.defined = defined;
function empty(a) {
    return !a || a.length === 0;
}
exports.empty = empty;
// like mithril prop but with type safety
function prop(initialValue) {
    let value = initialValue;
    const fun = function (v) {
        if (defined(v))
            value = v;
        return value;
    };
    return fun;
}
exports.prop = prop;

},{}],132:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const throttle_1 = require("./throttle");
function runner(hacks, throttleMs = 100) {
    let timeout;
    const runHacks = throttle_1.default(throttleMs, () => {
        window.lichess.raf(() => {
            hacks();
            schedule();
        });
    });
    function schedule() {
        timeout && clearTimeout(timeout);
        timeout = setTimeout(runHacks, 500);
    }
    runHacks();
}
exports.runner = runner;
let lastMainBoardHeight;
// Firefox 60- needs this to properly compute the grid layout.
function fixMainBoardHeight(container) {
    const mainBoard = container.querySelector('.main-board'), width = mainBoard.offsetWidth;
    if (lastMainBoardHeight != width) {
        lastMainBoardHeight = width;
        mainBoard.style.height = width + 'px';
        mainBoard.querySelector('.cg-wrap').style.height = width + 'px';
        window.lichess.dispatchEvent(document.body, 'chessground.resize');
    }
}
exports.fixMainBoardHeight = fixMainBoardHeight;
let boundChessgroundResize = false;
function bindChessgroundResizeOnce(f) {
    if (!boundChessgroundResize) {
        boundChessgroundResize = true;
        document.body.addEventListener('chessground.resize', f);
    }
}
exports.bindChessgroundResizeOnce = bindChessgroundResizeOnce;
function needsBoardHeightFix() {
    // Chrome, Chromium, Brave, Opera, Safari 12+ are OK
    if (window.chrome)
        return false;
    // Firefox >= 61 is OK
    const ffv = navigator.userAgent.split('Firefox/');
    return !ffv[1] || parseInt(ffv[1]) < 61;
}
exports.needsBoardHeightFix = needsBoardHeightFix;

},{"./throttle":137}],133:[function(require,module,exports){
"use strict";
/* Based on: */
/*!
 * hoverIntent v1.10.0 // 2019.02.25 // jQuery v1.7.0+
 * http://briancherne.github.io/jquery-hoverIntent/
 *
 * You may use hoverIntent under the terms of the MIT license. Basically that
 * means you are free to use hoverIntent as long as this header is left intact.
 * Copyright 2007-2019 Brian Cherne
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.menuHover = () => window.lichess.raf(function () {
    if (window.lichess.hasTouchEvents)
        return;
    let interval = 100;
    let sensitivity = 10;
    // current X and Y position of mouse, updated during mousemove tracking (shared across instances)
    let cX, cY;
    // saves the current pointer position coordinates based on the given mousemove event
    let track = function (ev) {
        cX = ev.pageX;
        cY = ev.pageY;
    };
    // state properties:
    // timeoutId = timeout ID, reused for tracking mouse position and delaying "out" handler
    // isActive = plugin state, true after `over` is called just until `out` is called
    // pX, pY = previously-measured pointer coordinates, updated at each polling interval
    // event = string representing the namespaced event used for mouse tracking
    let state = {};
    $('#topnav.hover').each(function () {
        const $el = $(this).removeClass('hover'), handler = () => $el.toggleClass('hover');
        // compares current and previous mouse positions
        const compare = function () {
            // compare mouse positions to see if pointer has slowed enough to trigger `over` function
            if (Math.sqrt((state.pX - cX) * (state.pX - cX) + (state.pY - cY) * (state.pY - cY)) < sensitivity) {
                $el.off(state.event, track);
                delete state.timeoutId;
                // set hoverIntent state as active for this element (permits `out` handler to trigger)
                state.isActive = true;
                handler();
            }
            else {
                // set previous coordinates for next comparison
                state.pX = cX;
                state.pY = cY;
                // use self-calling timeout, guarantees intervals are spaced out properly (avoids JavaScript timer bugs)
                state.timeoutId = setTimeout(compare, interval);
            }
        };
        // A private function for handling mouse 'hovering'
        var handleHover = function (ev) {
            // clear any existing timeout
            if (state.timeoutId) {
                state.timeoutId = clearTimeout(state.timeoutId);
            }
            // namespaced event used to register and unregister mousemove tracking
            var mousemove = state.event = 'mousemove';
            // handle the event, based on its type
            if (ev.type == 'mouseenter') {
                // do nothing if already active or a button is pressed (dragging a piece)
                if (state.isActive || ev.originalEvent.buttons)
                    return;
                // set "previous" X and Y position based on initial entry point
                state.pX = ev.pageX;
                state.pY = ev.pageY;
                // update "current" X and Y position based on mousemove
                $el.off(mousemove, track).on(mousemove, track);
                // start polling interval (self-calling timeout) to compare mouse coordinates over time
                state.timeoutId = setTimeout(compare, interval);
            }
            else { // "mouseleave"
                // do nothing if not already active
                if (!state.isActive)
                    return;
                // unbind expensive mousemove event
                $el.off(mousemove, track);
                // if hoverIntent state is true, then call the mouseOut function after the specified delay
                state = {};
                handler();
            }
        };
        $el.on('mouseenter', handleHover).on('mouseleave', handleHover);
    });
});

},{}],134:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function resizeHandle(els, pref, ply, visible) {
    if (!pref)
        return;
    const el = document.createElement('cg-resize');
    els.container.appendChild(el);
    const startResize = (start) => {
        start.preventDefault();
        const mousemoveEvent = start.type === 'touchstart' ? 'touchmove' : 'mousemove';
        const mouseupEvent = start.type === 'touchstart' ? 'touchend' : 'mouseup';
        const startPos = eventPosition(start);
        const initialZoom = parseInt(getComputedStyle(document.body).getPropertyValue('--zoom'));
        let zoom = initialZoom;
        const saveZoom = window.lichess.debounce(() => {
            $.ajax({ method: 'post', url: '/pref/zoom?v=' + (100 + zoom) });
        }, 700);
        const resize = (move) => {
            const pos = eventPosition(move);
            const delta = pos[0] - startPos[0] + pos[1] - startPos[1];
            zoom = Math.round(Math.min(100, Math.max(0, initialZoom + delta / 10)));
            document.body.setAttribute('style', '--zoom:' + zoom);
            window.lichess.dispatchEvent(window, 'resize');
            saveZoom();
        };
        document.body.classList.add('resizing');
        document.addEventListener(mousemoveEvent, resize);
        document.addEventListener(mouseupEvent, () => {
            document.removeEventListener(mousemoveEvent, resize);
            document.body.classList.remove('resizing');
        }, { once: true });
    };
    el.addEventListener('touchstart', startResize);
    el.addEventListener('mousedown', startResize);
    if (pref == 1) {
        const toggle = (ply) => el.classList.toggle('none', visible ? !visible(ply) : ply >= 2);
        toggle(ply);
        window.lichess.pubsub.on('ply', toggle);
    }
    addNag(el);
}
exports.default = resizeHandle;
function eventPosition(e) {
    if (e.clientX || e.clientX === 0)
        return [e.clientX, e.clientY];
    if (e.touches && e.targetTouches[0])
        return [e.targetTouches[0].clientX, e.targetTouches[0].clientY];
    return undefined;
}
function addNag(el) {
    const storage = window.lichess.storage.makeBoolean('resize-nag');
    if (storage.get())
        return;
    window.lichess.loadCssPath('nag-circle');
    el.title = 'Drag to resize';
    el.innerHTML = '<div class="nag-circle"></div>';
    for (const mousedownEvent of ['touchstart', 'mousedown']) {
        el.addEventListener(mousedownEvent, () => {
            storage.set(true);
            el.innerHTML = '';
        }, { once: true });
    }
    setTimeout(() => storage.set(true), 15000);
}

},{}],135:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("./common");
const storage = window.lichess.storage;
function storedProp(k, defaultValue) {
    const sk = 'analyse.' + k;
    const isBoolean = defaultValue === true || defaultValue === false;
    let value;
    return function (v) {
        if (common_1.defined(v) && v != value) {
            value = v + '';
            storage.set(sk, v);
        }
        else if (!common_1.defined(value)) {
            value = storage.get(sk);
            if (value === null)
                value = defaultValue + '';
        }
        return isBoolean ? value === 'true' : value;
    };
}
exports.storedProp = storedProp;
function storedJsonProp(key, defaultValue) {
    return function (v) {
        if (common_1.defined(v)) {
            storage.set(key, JSON.stringify(v));
            return v;
        }
        const ret = JSON.parse(storage.get(key));
        return (ret !== null) ? ret : defaultValue;
    };
}
exports.storedJsonProp = storedJsonProp;

},{"./common":131}],136:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function sync(promise) {
    const sync = {
        sync: undefined,
        promise: promise.then(v => {
            sync.sync = v;
            return v;
        })
    };
    return sync;
}
exports.sync = sync;

},{}],137:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Ensures calls to the wrapped function are spaced by the given delay.
// Any extra calls are dropped, except the last one.
function throttle(delay, callback) {
    let timer;
    let lastExec = 0;
    return function (...args) {
        const self = this;
        const elapsed = performance.now() - lastExec;
        function exec() {
            timer = undefined;
            lastExec = performance.now();
            callback.apply(self, args);
        }
        if (timer)
            clearTimeout(timer);
        if (elapsed > delay)
            exec();
        else
            timer = setTimeout(exec, delay - elapsed);
    };
}
exports.default = throttle;

},{}],138:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const status = require("./status");
function playable(data) {
    return data.game.status.id < status.ids.aborted && !imported(data);
}
exports.playable = playable;
function isPlayerPlaying(data) {
    return playable(data) && !data.player.spectator;
}
exports.isPlayerPlaying = isPlayerPlaying;
function isPlayerTurn(data) {
    return isPlayerPlaying(data) && data.game.player == data.player.color;
}
exports.isPlayerTurn = isPlayerTurn;
function isFriendGame(data) {
    return data.game.source === 'friend';
}
exports.isFriendGame = isFriendGame;
function isClassical(data) {
    return data.game.perf === 'classical';
}
exports.isClassical = isClassical;
function mandatory(data) {
    return !!data.tournament || !!data.simul;
}
exports.mandatory = mandatory;
function playedTurns(data) {
    return data.game.turns - (data.game.startedAtTurn || 0);
}
exports.playedTurns = playedTurns;
function bothPlayersHavePlayed(data) {
    return playedTurns(data) > 1;
}
exports.bothPlayersHavePlayed = bothPlayersHavePlayed;
function abortable(data) {
    return playable(data) && !bothPlayersHavePlayed(data) && !mandatory(data);
}
exports.abortable = abortable;
function takebackable(data) {
    return playable(data) &&
        data.takebackable &&
        bothPlayersHavePlayed(data) &&
        !data.player.proposingTakeback &&
        !data.opponent.proposingTakeback;
}
exports.takebackable = takebackable;
function drawable(data) {
    return playable(data) &&
        data.game.turns >= 2 &&
        !data.player.offeringDraw &&
        !hasAi(data);
}
exports.drawable = drawable;
function resignable(data) {
    return playable(data) && !abortable(data);
}
exports.resignable = resignable;
// can the current player go berserk?
function berserkableBy(data) {
    return !!data.tournament &&
        data.tournament.berserkable &&
        isPlayerPlaying(data) &&
        !bothPlayersHavePlayed(data);
}
exports.berserkableBy = berserkableBy;
function moretimeable(data) {
    return isPlayerPlaying(data) && data.moretimeable && (!!data.clock ||
        (!!data.correspondence &&
            data.correspondence[data.opponent.color] < (data.correspondence.increment - 3600)));
}
exports.moretimeable = moretimeable;
function imported(data) {
    return data.game.source === 'import';
}
exports.imported = imported;
function replayable(data) {
    return imported(data) || status.finished(data) ||
        (status.aborted(data) && bothPlayersHavePlayed(data));
}
exports.replayable = replayable;
function getPlayer(data, color) {
    if (data.player.color === color)
        return data.player;
    if (data.opponent.color === color)
        return data.opponent;
    return null;
}
exports.getPlayer = getPlayer;
function hasAi(data) {
    return !!(data.player.ai || data.opponent.ai);
}
exports.hasAi = hasAi;
function userAnalysable(data) {
    return status.finished(data) || playable(data) && (!data.clock || !isPlayerPlaying(data));
}
exports.userAnalysable = userAnalysable;
function isCorrespondence(data) {
    return data.game.speed === 'correspondence';
}
exports.isCorrespondence = isCorrespondence;
function setOnGame(data, color, onGame) {
    const player = getPlayer(data, color);
    onGame = onGame || !!player.ai;
    player.onGame = onGame;
    if (onGame)
        setGone(data, color, false);
}
exports.setOnGame = setOnGame;
function setGone(data, color, gone) {
    const player = getPlayer(data, color);
    player.gone = !player.ai && gone;
    if (player.gone === false && player.user)
        player.user.online = true;
}
exports.setGone = setGone;
function nbMoves(data, color) {
    return Math.floor((data.game.turns + (color == 'white' ? 1 : 0)) / 2);
}
exports.nbMoves = nbMoves;
function isSwitchable(data) {
    return !hasAi(data) && (!!data.simul || isCorrespondence(data));
}
exports.isSwitchable = isSwitchable;

},{"./status":140}],139:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function game(data, color, embed) {
    const id = data.game ? data.game.id : data;
    return (embed ? '/embed/' : '/') + id + (color ? '/' + color : '');
}
exports.game = game;
function cont(data, mode) {
    return game(data) + '/continue/' + mode;
}
exports.cont = cont;

},{}],140:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// https://github.com/ornicar/scalachess/blob/master/src/main/scala/Status.scala
exports.ids = {
    created: 10,
    started: 20,
    aborted: 25,
    mate: 30,
    resign: 31,
    stalemate: 32,
    timeout: 33,
    draw: 34,
    outoftime: 35,
    cheat: 36,
    noStart: 37,
    variantEnd: 60
};
function started(data) {
    return data.game.status.id >= exports.ids.started;
}
exports.started = started;
function finished(data) {
    return data.game.status.id >= exports.ids.mate;
}
exports.finished = finished;
function aborted(data) {
    return data.game.status.id === exports.ids.aborted;
}
exports.aborted = aborted;
function playing(data) {
    return started(data) && !finished(data) && !aborted(data);
}
exports.playing = playing;

},{}],141:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function status(ctrl) {
    const noarg = ctrl.trans.noarg, d = ctrl.data;
    switch (d.game.status.name) {
        case 'started':
            return noarg('playingRightNow');
        case 'aborted':
            return noarg('gameAborted');
        case 'mate':
            return noarg('checkmate');
        case 'resign':
            return noarg(d.game.winner == 'white' ? 'blackResigned' : 'whiteResigned');
        case 'stalemate':
            return noarg('stalemate');
        case 'timeout':
            switch (d.game.winner) {
                case 'white':
                    return noarg('blackLeftTheGame');
                case 'black':
                    return noarg('whiteLeftTheGame');
            }
            return noarg('draw');
        case 'draw':
            return noarg('draw');
        case 'outoftime':
            return noarg('timeOut');
        case 'noStart':
            return (d.game.winner == 'white' ? 'Black' : 'White') + ' didn\'t move';
        case 'cheat':
            return 'Cheat detected';
        case 'variantEnd':
            switch (d.game.variant.key) {
                case 'kingOfTheHill':
                    return noarg('kingInTheCenter');
                case 'threeCheck':
                    return noarg('threeChecks');
            }
            return noarg('variantEnding');
        default:
            return d.game.status.name;
    }
}
exports.default = status;

},{}],142:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tree_1 = require("./tree");
exports.build = tree_1.build;
const path = require("./path");
exports.path = path;
const ops = require("./ops");
exports.ops = ops;

},{"./ops":143,"./path":144,"./tree":145}],143:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function withMainlineChild(node, f) {
    const next = node.children[0];
    return next ? f(next) : undefined;
}
exports.withMainlineChild = withMainlineChild;
function findInMainline(fromNode, predicate) {
    const findFrom = function (node) {
        if (predicate(node))
            return node;
        return withMainlineChild(node, findFrom);
    };
    return findFrom(fromNode);
}
exports.findInMainline = findInMainline;
// returns a list of nodes collected from the original one
function collect(from, pickChild) {
    let nodes = [from], n = from, c;
    while (c = pickChild(n)) {
        nodes.push(c);
        n = c;
    }
    return nodes;
}
exports.collect = collect;
function pickFirstChild(node) {
    return node.children[0];
}
function childById(node, id) {
    return node.children.find(child => child.id === id);
}
exports.childById = childById;
function last(nodeList) {
    return nodeList[nodeList.length - 1];
}
exports.last = last;
function nodeAtPly(nodeList, ply) {
    return nodeList.find(node => node.ply === ply);
}
exports.nodeAtPly = nodeAtPly;
function takePathWhile(nodeList, predicate) {
    let path = '';
    for (let i in nodeList) {
        if (predicate(nodeList[i]))
            path += nodeList[i].id;
        else
            break;
    }
    return path;
}
exports.takePathWhile = takePathWhile;
function removeChild(parent, id) {
    parent.children = parent.children.filter(function (n) {
        return n.id !== id;
    });
}
exports.removeChild = removeChild;
function countChildrenAndComments(node) {
    const count = {
        nodes: 1,
        comments: (node.comments || []).length
    };
    node.children.forEach(function (child) {
        const c = countChildrenAndComments(child);
        count.nodes += c.nodes;
        count.comments += c.comments;
    });
    return count;
}
exports.countChildrenAndComments = countChildrenAndComments;
function reconstruct(parts) {
    const root = parts[0], nb = parts.length;
    let node = root, i;
    root.id = '';
    for (i = 1; i < nb; i++) {
        const n = parts[i];
        if (node.children)
            node.children.unshift(n);
        else
            node.children = [n];
        node = n;
    }
    node.children = node.children || [];
    return root;
}
exports.reconstruct = reconstruct;
// adds n2 into n1
function merge(n1, n2) {
    n1.eval = n2.eval;
    if (n2.glyphs)
        n1.glyphs = n2.glyphs;
    n2.comments && n2.comments.forEach(function (c) {
        if (!n1.comments)
            n1.comments = [c];
        else if (!n1.comments.filter(function (d) {
            return d.text === c.text;
        }).length)
            n1.comments.push(c);
    });
    n2.children.forEach(function (c) {
        const existing = childById(n1, c.id);
        if (existing)
            merge(existing, c);
        else
            n1.children.push(c);
    });
}
exports.merge = merge;
function hasBranching(node, maxDepth) {
    return maxDepth <= 0 || !!node.children[1] || (node.children[0] && hasBranching(node.children[0], maxDepth - 1));
}
exports.hasBranching = hasBranching;
function mainlineNodeList(from) {
    return collect(from, pickFirstChild);
}
exports.mainlineNodeList = mainlineNodeList;
function updateAll(root, f) {
    // applies f recursively to all nodes
    function update(node) {
        f(node);
        node.children.forEach(update);
    }
    ;
    update(root);
}
exports.updateAll = updateAll;

},{}],144:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.root = '';
function size(path) {
    return path.length / 2;
}
exports.size = size;
function head(path) {
    return path.slice(0, 2);
}
exports.head = head;
function tail(path) {
    return path.slice(2);
}
exports.tail = tail;
function init(path) {
    return path.slice(0, -2);
}
exports.init = init;
function last(path) {
    return path.slice(-2);
}
exports.last = last;
function contains(p1, p2) {
    return p1.startsWith(p2);
}
exports.contains = contains;
function fromNodeList(nodes) {
    var path = '';
    for (var i in nodes)
        path += nodes[i].id;
    return path;
}
exports.fromNodeList = fromNodeList;
function isChildOf(child, parent) {
    return !!child && child.slice(0, -2) === parent;
}
exports.isChildOf = isChildOf;

},{}],145:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const treePath = require("./path");
const ops = require("./ops");
const common_1 = require("common");
function build(root) {
    function lastNode() {
        return ops.findInMainline(root, function (node) {
            return !node.children.length;
        });
    }
    function nodeAtPath(path) {
        return nodeAtPathFrom(root, path);
    }
    function nodeAtPathFrom(node, path) {
        if (path === '')
            return node;
        const child = ops.childById(node, treePath.head(path));
        return child ? nodeAtPathFrom(child, treePath.tail(path)) : node;
    }
    function nodeAtPathOrNull(path) {
        return nodeAtPathOrNullFrom(root, path);
    }
    function nodeAtPathOrNullFrom(node, path) {
        if (path === '')
            return node;
        const child = ops.childById(node, treePath.head(path));
        return child ? nodeAtPathOrNullFrom(child, treePath.tail(path)) : undefined;
    }
    function longestValidPathFrom(node, path) {
        var id = treePath.head(path);
        const child = ops.childById(node, id);
        return child ? id + longestValidPathFrom(child, treePath.tail(path)) : '';
    }
    function getCurrentNodesAfterPly(nodeList, mainline, ply) {
        var node, nodes = [];
        for (var i in nodeList) {
            node = nodeList[i];
            if (node.ply <= ply && mainline[i].id !== node.id)
                break;
            if (node.ply > ply)
                nodes.push(node);
        }
        return nodes;
    }
    ;
    function pathIsMainline(path) {
        return pathIsMainlineFrom(root, path);
    }
    function pathExists(path) {
        return !!nodeAtPathOrNull(path);
    }
    function pathIsMainlineFrom(node, path) {
        if (path === '')
            return true;
        const pathId = treePath.head(path), child = node.children[0];
        if (!child || child.id !== pathId)
            return false;
        return pathIsMainlineFrom(child, treePath.tail(path));
    }
    function pathIsForcedVariation(path) {
        return !!getNodeList(path).find(n => n.forceVariation);
    }
    function lastMainlineNodeFrom(node, path) {
        if (path === '')
            return node;
        const pathId = treePath.head(path);
        const child = node.children[0];
        if (!child || child.id !== pathId)
            return node;
        return lastMainlineNodeFrom(child, treePath.tail(path));
    }
    function getNodeList(path) {
        return ops.collect(root, function (node) {
            const id = treePath.head(path);
            if (id === '')
                return;
            path = treePath.tail(path);
            return ops.childById(node, id);
        });
    }
    function getOpening(nodeList) {
        var opening;
        nodeList.forEach(function (node) {
            opening = node.opening || opening;
        });
        return opening;
    }
    function updateAt(path, update) {
        const node = nodeAtPathOrNull(path);
        if (node) {
            update(node);
            return node;
        }
        return;
    }
    // returns new path
    function addNode(node, path) {
        const newPath = path + node.id, existing = nodeAtPathOrNull(newPath);
        if (existing) {
            ['dests', 'drops', 'clock'].forEach(key => {
                if (common_1.defined(node[key]) && !common_1.defined(existing[key]))
                    existing[key] = node[key];
            });
            return newPath;
        }
        return updateAt(path, function (parent) {
            parent.children.push(node);
        }) ? newPath : undefined;
    }
    function addNodes(nodes, path) {
        var node = nodes[0];
        if (!node)
            return path;
        const newPath = addNode(node, path);
        return newPath ? addNodes(nodes.slice(1), newPath) : undefined;
    }
    function deleteNodeAt(path) {
        ops.removeChild(parentNode(path), treePath.last(path));
    }
    function promoteAt(path, toMainline) {
        var nodes = getNodeList(path);
        for (var i = nodes.length - 2; i >= 0; i--) {
            var node = nodes[i + 1];
            var parent = nodes[i];
            if (parent.children[0].id !== node.id) {
                ops.removeChild(parent, node.id);
                parent.children.unshift(node);
                if (!toMainline)
                    break;
            }
            else if (node.forceVariation) {
                node.forceVariation = false;
                if (!toMainline)
                    break;
            }
        }
    }
    function setCommentAt(comment, path) {
        return !comment.text ? deleteCommentAt(comment.id, path) : updateAt(path, function (node) {
            node.comments = node.comments || [];
            const existing = node.comments.find(function (c) {
                return c.id === comment.id;
            });
            if (existing)
                existing.text = comment.text;
            else
                node.comments.push(comment);
        });
    }
    function deleteCommentAt(id, path) {
        return updateAt(path, function (node) {
            var comments = (node.comments || []).filter(function (c) {
                return c.id !== id;
            });
            node.comments = comments.length ? comments : undefined;
        });
    }
    function setGlyphsAt(glyphs, path) {
        return updateAt(path, function (node) {
            node.glyphs = glyphs;
        });
    }
    function parentNode(path) {
        return nodeAtPath(treePath.init(path));
    }
    function getParentClock(node, path) {
        if (!('parentClock' in node)) {
            const par = path && parentNode(path);
            if (!par)
                node.parentClock = node.clock;
            else if (!('clock' in par))
                node.parentClock = undefined;
            else
                node.parentClock = par.clock;
        }
        return node.parentClock;
    }
    return {
        root,
        lastPly() {
            return lastNode().ply;
        },
        nodeAtPath,
        getNodeList,
        longestValidPath: (path) => longestValidPathFrom(root, path),
        getOpening,
        updateAt,
        addNode,
        addNodes,
        addDests(dests, path, opening) {
            return updateAt(path, function (node) {
                node.dests = dests;
                if (opening)
                    node.opening = opening;
            });
        },
        setShapes(shapes, path) {
            return updateAt(path, function (node) {
                node.shapes = shapes;
            });
        },
        setCommentAt,
        deleteCommentAt,
        setGlyphsAt,
        setClockAt(clock, path) {
            return updateAt(path, function (node) {
                node.clock = clock;
            });
        },
        pathIsMainline,
        pathIsForcedVariation,
        lastMainlineNode(path) {
            return lastMainlineNodeFrom(root, path);
        },
        pathExists,
        deleteNodeAt,
        promoteAt,
        forceVariationAt(path, force) {
            return updateAt(path, function (node) {
                node.forceVariation = force;
            });
        },
        getCurrentNodesAfterPly,
        merge(tree) {
            ops.merge(root, tree);
        },
        removeCeval() {
            ops.updateAll(root, function (n) {
                delete n.ceval;
                delete n.threat;
            });
        },
        removeComputerVariations() {
            ops.mainlineNodeList(root).forEach(function (n) {
                n.children = n.children.filter(function (c) {
                    return !c.comp;
                });
            });
        },
        parentNode,
        getParentClock
    };
}
exports.build = build;

},{"./ops":143,"./path":144,"common":131}]},{},[62])(62)
});
