'use client'
import { useState } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useSearchParams, useRouter } from 'next/navigation';


export default function AuthForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  const togglePassword = () => setShowPassword(!showPassword);
  const toggleAuthMode = () => {
    setIsSignup(!isSignup);
    setError("");
    reset();
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setError("");
    try {
      const endpoint = isSignup ? "/register" : "/login";
      const response = await axios.post(`https://bignsah.onrender.com/api/auth/${endpoint}`, data);
      if (!isSignup) {
        // Store both token and userId in localStorage
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("userId", response.data.userId);
        window.location.reload();
        router.push('/'); // Redirect to dashboard or any other route after login
        rou
      } else {
        // Show success message or automatically log in the user after signup
        setError("Account created successfully! You can now login.");
        setIsSignup(false);
      }
      reset();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">
        {isSignup ? "Create an Account" : "Login to Bignasg Datahub"}
      </h2>
      
      {error && 
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      }
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {isSignup && (
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              {...register("name", { required: isSignup })}
              className="w-full p-2 border rounded-md"
              placeholder="Enter your full name"
            />
          </div>
        )}
        
        {isSignup && (
          <div className="space-y-2">
            <label htmlFor="username" className="block text-sm font-medium">
              Username
            </label>
            <input
              id="username"
              type="text"
              {...register("username", { required: isSignup })}
              className="w-full p-2 border rounded-md"
              placeholder="Choose a username"
            />
          </div>
        )}
        
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            {...register("email", { required: true })}
            className="w-full p-2 border rounded-md"
            placeholder="Enter your email"
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              {...register("password", { required: true })}
              className="w-full p-2 border rounded-md pr-10"
              placeholder="Enter your password"
            />
            <button 
              type="button" 
              onClick={togglePassword} 
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center"
        >
          {loading ? 
            <Loader2 size={20} className="animate-spin mr-2" /> : 
            isSignup ? "Sign Up" : "Login"}
        </button>
      </form>
      
      <div className="mt-4 text-center">
        <p className="text-sm">
          {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={toggleAuthMode}
            className="text-blue-600 hover:underline"
          >
            {isSignup ? "Login" : "Sign Up"}
          </button>
        </p>
      </div>
    </div>
  );
}