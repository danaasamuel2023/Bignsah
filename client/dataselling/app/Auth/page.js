'use client'
import { useState, useEffect } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter } from 'next/navigation';

export default function AuthForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.push('/'); // Redirect if user is already logged in
    }
  }, []);

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
      const endpoint = isSignup ? "register" : "login";
      const response = await axios.post(`https://bignsah.onrender.com/api/auth/${endpoint}`, data);
      
      if (!isSignup) {
        // Store token and userId in localStorage
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("userId", response.data.userId);
        localStorage.setItem("userrole", response.data.role);

        router.push('/'); // Redirect to home page after login
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
    <div className="w-full max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-700">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-white">
        {isSignup ? "Create an Account" : "Login to Bignasg Datahub"}
      </h2>
      
      {error && 
        <div className={`mb-4 p-3 rounded-md ${error.includes("successfully") ? 
          "bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-100" : 
          "bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-100"}`}>
          {error}
        </div>
      }
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {isSignup && (
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              {...register("name", { required: isSignup })}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md 
                        bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                        focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              placeholder="Enter your full name"
            />
          </div>
        )}
        
        {isSignup && (
          <div className="space-y-2">
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Username
            </label>
            <input
              id="username"
              type="text"
              {...register("username", { required: isSignup })}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md 
                        bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                        focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              placeholder="Choose a username"
            />
          </div>
        )}

        {isSignup && (
          <div className="space-y-2">
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              {...register("phone", { required: isSignup })}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md 
                        bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                        focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              placeholder="Enter your phone number"
            />
          </div>
        )}
        
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            Email
          </label>
          <input
            id="email"
            type="email"
            {...register("email", { required: true })}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md 
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                      focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
            placeholder="Enter your email"
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              {...register("password", { required: true })}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md 
                        bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                        focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent pr-10"
              placeholder="Enter your password"
            />
            <button 
              type="button" 
              onClick={togglePassword} 
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 dark:text-gray-300"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 dark:bg-blue-500 text-white font-medium rounded-md 
                    hover:bg-blue-700 dark:hover:bg-blue-600 
                    disabled:bg-blue-300 dark:disabled:bg-blue-700 disabled:cursor-not-allowed
                    transition-colors duration-200 flex items-center justify-center"
        >
          {loading ? 
            <Loader2 size={20} className="animate-spin mr-2" /> : 
            isSignup ? "Sign Up" : "Login"}
        </button>
      </form>
      
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={toggleAuthMode}
            className="text-blue-600 dark:text-blue-400 font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            {isSignup ? "Login" : "Sign Up"}
          </button>
        </p>
      </div>
    </div>
  );
}