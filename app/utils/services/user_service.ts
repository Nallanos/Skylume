import User from "#models/user";

export async function login(uid: number) {
    User.findForAuth([], uid.toString())
}