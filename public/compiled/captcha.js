$((function(){lichess.requestIdleCallback((function(){$("div.captcha").each((function(){var e=$(this),s=e.find(".mini-board"),t=e.find("input").val(""),a=s.data("chessground"),n=JSON.parse(lichess.readServerFen(s.data("x")));for(var o in n)n[o]=n[o].match(/.{2}/g);a.set({turnColor:a.state.orientation,movable:{free:!1,dests:n,color:a.state.orientation,events:{after:function(s,t){e.removeClass("success failure"),r(s+" "+t)}}}});var r=function(o){t.val(o),$.ajax({url:e.data("check-url"),data:{solution:o},success:function(t){e.toggleClass("success",1==t),e.toggleClass("failure",1!=t),1==t?s.data("chessground").stop():setTimeout((function(){lichess.parseFen(s),s.data("chessground").set({turnColor:a.state.orientation,movable:{dests:n}})}),300)}})}}))}))}));