import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { authApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

export default function Register() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  
  const registerMutation = useMutation({
    mutationFn: () => authApi.register({ email, password, name: name || undefined }),
    onSuccess: (response) => {
      if (response.data.success && response.data.data) {
        setAuth(response.data.data.user, response.data.data.token);
        navigate('/files');
      }
    },
    onError: (error: any) => {
      toast({
        title: '注册失败',
        description: error.response?.data?.error?.message || '请检查输入信息',
        variant: 'destructive',
      });
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: '密码不匹配',
        description: '请确保两次输入的密码一致',
        variant: 'destructive',
      });
      return;
    }
    
    registerMutation.mutate();
  };
  
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>注册</CardTitle>
        <CardDescription>创建一个新账号开始使用</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              昵称（可选）
            </label>
            <Input
              id="name"
              type="text"
              placeholder="您的昵称"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              邮箱
            </label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              密码
            </label>
            <Input
              id="password"
              type="password"
              placeholder="至少6个字符"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              确认密码
            </label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="再次输入密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
            {registerMutation.isPending ? '注册中...' : '注册'}
          </Button>
          <p className="text-sm text-muted-foreground">
            已有账号？{' '}
            <Link to="/login" className="text-primary hover:underline">
              立即登录
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
