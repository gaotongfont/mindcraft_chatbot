import request from '@/utils/request'
// 获取对话列表
export function getSessionList(params) {
    return request({
        url: '/v1/session/',
        method: 'GET',
        params,
    })
}
// 创建新对话（没有对话房间时，则手动创建一个，参数默认）
export function AddSessionList() {
    return request({
        url: '/v1/session/',
        method: 'POST',
        params: {
            session_name: "test",
            session_remark: {},
            config_data: {},
            model: "deepseek-chat",
            prompt: "#",
            temperature: 0.2,
            max_tokens: 4000,
            history_length: 8
        }
    })
}


// 获取历史记录
export function getHistoryList(params) {
    return request({
        url: '/v1/message/',
        method: 'GET',
        params,
    })
}
export function deleteHistory(params) {
    return request({
        url: '/v1/message/clear/',
        method: 'POST',
        params,
    })
}
//  根据id获取角色列表
export function getCharacterList(params) {
    return request({
        url: '/v1/character/uuid_list/',
        method: 'POST',
        data: params
    })
}
// 根据id获取用户列表
export function getUserList(params) {
    return request({
        url: '/v1/user/character/uuid_list/',
        method: 'POST',
        data: params
    })
}