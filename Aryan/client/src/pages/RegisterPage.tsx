import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Anchor, Button, Card, Stack, Text, TextInput } from '@mantine/core'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { PageShellCentered } from '@/lib/layout'
import { useAuth } from '@/contexts/auth-context'

const registerSchema = z.object({
  name: z.string().max(100).optional().or(z.literal('')),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Use at least 8 characters'),
  phone: z.string().max(20).optional().or(z.literal('')),
})

type RegisterValues = z.infer<typeof registerSchema>

export function RegisterPage() {
  const navigate = useNavigate()
  const { register: registerUser, user } = useAuth()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', phone: '' },
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        name: data.name || undefined,
        phone: data.phone || undefined,
      })
      navigate('/account', { replace: true })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Registration failed'
      setError('root', { message })
    }
  })

  if (user) {
    return <Navigate to="/account" replace />
  }

  return (
    <PageShellCentered>
      <Card withBorder shadow="sm" padding="lg" radius="md" w="100%">
        <Stack gap="xs" mb="md">
          <Text size="xl" fw={600}>
            Create account
          </Text>
          <Text size="sm" c="dimmed">
            Register as a student to browse and enroll in courses.
          </Text>
        </Stack>
        <form onSubmit={onSubmit}>
          <Stack gap="md">
            <TextInput label="Name (optional)" id="name" autoComplete="name" {...register('name')} />
            <TextInput
              label="Email"
              id="email"
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <TextInput
              label="Password"
              id="password"
              type="password"
              autoComplete="new-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <TextInput id="phone" label="Phone (optional)" type="tel" autoComplete="tel" {...register('phone')} />
            {errors.root ? (
              <Text size="sm" c="red" role="alert">
                {errors.root.message}
              </Text>
            ) : null}
            <Button type="submit" fullWidth loading={isSubmitting}>
              {isSubmitting ? 'Creating account…' : 'Sign up'}
            </Button>
          </Stack>
        </form>
        <Text size="sm" c="dimmed" ta="center" mt="md">
          Already have an account?{' '}
          <Anchor component={Link} to="/login" size="sm">
            Sign in
          </Anchor>
        </Text>
      </Card>
    </PageShellCentered>
  )
}
