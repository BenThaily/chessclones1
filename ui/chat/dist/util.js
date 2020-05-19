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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy91dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsdUNBQTRCO0FBRzVCLFNBQWdCLFFBQVEsQ0FBQyxDQUFTLEVBQUUsS0FBYztJQUNoRCxNQUFNLEtBQUssR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNqQyxPQUFPLFlBQUMsQ0FBQyxHQUFHLEVBQUU7UUFDWixxQ0FBcUM7UUFDckMsS0FBSyxFQUFFO1lBQ0wsV0FBVyxFQUFFLElBQUk7WUFDakIsSUFBSSxFQUFFLElBQUk7U0FDWDtRQUNELEtBQUssRUFBRTtZQUNMLElBQUksRUFBRSxLQUFLLEdBQUcsQ0FBQztTQUNoQjtLQUNGLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNULFlBQUMsQ0FDQyxZQUFZLEVBQ1osS0FBSyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUNwRCxLQUFLLENBQUMsRUFBRSxLQUFLO0tBQ2hCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUNmLENBQUM7QUFqQkQsNEJBaUJDO0FBRUQsU0FBZ0IsT0FBTztJQUNyQixPQUFPLFlBQUMsQ0FBQyxhQUFhLEVBQUU7UUFDdEIsWUFBQyxDQUFDLEtBQUssRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFFO1lBQzVDLFlBQUMsQ0FBQyxRQUFRLEVBQUU7Z0JBQ1YsS0FBSyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRTthQUMvQyxDQUFDO1NBQUMsQ0FBQztLQUFDLENBQUMsQ0FBQztBQUNiLENBQUM7QUFORCwwQkFNQztBQUVELFNBQWdCLElBQUksQ0FBQyxTQUFpQixFQUFFLENBQXFCO0lBQzNELE9BQU87UUFDTCxNQUFNLEVBQUUsQ0FBQyxLQUFZLEVBQUUsRUFBRTtZQUN0QixLQUFLLENBQUMsR0FBbUIsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUQsQ0FBQztLQUNGLENBQUM7QUFDSixDQUFDO0FBTkQsb0JBTUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBoIH0gZnJvbSAnc25hYmJkb20nXG5pbXBvcnQgeyBWTm9kZSB9IGZyb20gJ3NuYWJiZG9tL3Zub2RlJ1xuXG5leHBvcnQgZnVuY3Rpb24gdXNlckxpbmsodTogc3RyaW5nLCB0aXRsZT86IHN0cmluZykge1xuICBjb25zdCB0cnVuYyA9IHUuc3Vic3RyaW5nKDAsIDE0KTtcbiAgcmV0dXJuIGgoJ2EnLCB7XG4gICAgLy8gY2FuJ3QgYmUgaW5saW5lZCBiZWNhdXNlIG9mIHRodW5rc1xuICAgIGNsYXNzOiB7XG4gICAgICAndXNlci1saW5rJzogdHJ1ZSxcbiAgICAgIHVscHQ6IHRydWVcbiAgICB9LFxuICAgIGF0dHJzOiB7XG4gICAgICBocmVmOiAnL0AvJyArIHVcbiAgICB9XG4gIH0sIHRpdGxlID8gW1xuICAgIGgoXG4gICAgICAnc3Bhbi50aXRsZScsXG4gICAgICB0aXRsZSA9PSAnQk9UJyA/IHsgYXR0cnM6IHsnZGF0YS1ib3QnOiB0cnVlIH0gfSA6IHt9LFxuICAgICAgdGl0bGUpLCB0cnVuY1xuICBdIDogW3RydW5jXSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzcGlubmVyKCkge1xuICByZXR1cm4gaCgnZGl2LnNwaW5uZXInLCBbXG4gICAgaCgnc3ZnJywgeyBhdHRyczogeyB2aWV3Qm94OiAnMCAwIDQwIDQwJyB9IH0sIFtcbiAgICAgIGgoJ2NpcmNsZScsIHtcbiAgICAgICAgYXR0cnM6IHsgY3g6IDIwLCBjeTogMjAsIHI6IDE4LCBmaWxsOiAnbm9uZScgfVxuICAgICAgfSldKV0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYmluZChldmVudE5hbWU6IHN0cmluZywgZjogKGU6IEV2ZW50KSA9PiB2b2lkKSB7XG4gIHJldHVybiB7XG4gICAgaW5zZXJ0OiAodm5vZGU6IFZOb2RlKSA9PiB7XG4gICAgICAodm5vZGUuZWxtIGFzIEhUTUxFbGVtZW50KS5hZGRFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgZik7XG4gICAgfVxuICB9O1xufVxuIl19