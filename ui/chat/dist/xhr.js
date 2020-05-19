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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieGhyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3hoci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLFNBQWdCLFdBQVcsQ0FBQyxRQUFnQjtJQUMxQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEdBQUcsUUFBUSxDQUFDLENBQUE7QUFDNUMsQ0FBQztBQUZELGtDQUVDO0FBRUQsU0FBZ0IsSUFBSSxDQUFDLFFBQWdCLEVBQUUsUUFBZ0IsRUFBRSxJQUFZO0lBQ25FLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7QUFDOUQsQ0FBQztBQUZELG9CQUVDO0FBRUQsU0FBZ0IsT0FBTyxDQUFDLEVBQVU7SUFDaEMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQzVCLENBQUM7QUFGRCwwQkFFQztBQUVELFNBQWdCLE9BQU8sQ0FBQyxFQUFVLEVBQUUsSUFBWTtJQUM5QyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtBQUN0QyxDQUFDO0FBRkQsMEJBRUM7QUFFRCxTQUFTLE9BQU8sQ0FBQyxFQUFVO0lBQ3pCLE9BQU8sSUFBSSxFQUFFLE9BQU8sQ0FBQztBQUN2QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGZ1bmN0aW9uIHVzZXJNb2RJbmZvKHVzZXJuYW1lOiBzdHJpbmcpIHtcbiAgcmV0dXJuICQuZ2V0KCcvbW9kL2NoYXQtdXNlci8nICsgdXNlcm5hbWUpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmbGFnKHJlc291cmNlOiBzdHJpbmcsIHVzZXJuYW1lOiBzdHJpbmcsIHRleHQ6IHN0cmluZykge1xuICByZXR1cm4gJC5wb3N0KCcvcmVwb3J0L2ZsYWcnLCB7IHVzZXJuYW1lLCByZXNvdXJjZSwgdGV4dCB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldE5vdGUoaWQ6IHN0cmluZykge1xuICByZXR1cm4gJC5nZXQobm90ZVVybChpZCkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0Tm90ZShpZDogc3RyaW5nLCB0ZXh0OiBzdHJpbmcpIHtcbiAgcmV0dXJuICQucG9zdChub3RlVXJsKGlkKSwgeyB0ZXh0IH0pXG59XG5cbmZ1bmN0aW9uIG5vdGVVcmwoaWQ6IHN0cmluZykge1xuICByZXR1cm4gYC8ke2lkfS9ub3RlYDtcbn1cbiJdfQ==