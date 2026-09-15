import mongoose from "mongoose";

const loginUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
  },
  {
    collection: "login",
  }
);

const LoginUser = mongoose.model("LoginUser", loginUserSchema);

export default LoginUser;
