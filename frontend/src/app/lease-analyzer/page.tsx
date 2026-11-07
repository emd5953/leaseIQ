'use client'

import { useState, useRef, useEffect } from 'react'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import AnalysisResults from '@/components/analysis/AnalysisResults'
import { FileText, Upload, X, Image } from 'lucide-react'

import { api, apiJson } from '@/lib/api'
import { reportValue } from '@/lib/report-value'
import { useAuth } from '@/contexts/AuthContext'

export default function LeaseAnalyzerPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [emailRequested, setEmailRequested] = useState(false)
  const email = emailRequested ? user?.email || '' : ''
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [emailEnvelope, setEmailEnvelope] = useState<any>(null)
  const [emailRetrying, setEmailRetrying] = useState(false)
  const [partialErrors, setPartialErrors] = useState<Record<string, string>>({})
  const [features, setFeatures] = useState<any>(null)
  const [generatedAt, setGeneratedAt] = useState('')
  useEffect(() => {
    if (user)
      api
        .analysisStatus()
        .then((x) => setFeatures(x.features))
        .catch((e) => setError(e.message))
  }, [user])
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [floorPlanFile, setFloorPlanFile] = useState<File | null>(null)
  const [floorPlanPreview, setFloorPlanPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isDraggingFloorPlan, setIsDraggingFloorPlan] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const floorPlanInputRef = useRef<HTMLInputElement>(null)

  useEffect(
    () => () => {
      if (floorPlanPreview) URL.revokeObjectURL(floorPlanPreview)
    },
    [floorPlanPreview],
  )

  const handleFileSelect = (file: File) => {
    if (loading) return
    if (!user) {
      setError('Sign in before uploading documents.')
      return
    }
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    if (!allowed.includes(file.type)) {
      setError('Please upload a PDF file')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be under 10MB')
      return
    }
    setUploadedFile(file)
    setError(null)
  }

  const handleFloorPlanSelect = (file: File) => {
    if (loading) return
    if (!user) {
      setError('Sign in before uploading documents.')
      return
    }
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) {
      setError('Please upload an image file (PNG, JPEG, WebP, or GIF)')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be under 10MB')
      return
    }
    setFloorPlanFile(file)
    setFloorPlanPreview(URL.createObjectURL(file))
    setError(null)
  }

  const clearFloorPlan = () => {
    if (floorPlanPreview) URL.revokeObjectURL(floorPlanPreview)
    setFloorPlanFile(null)
    setFloorPlanPreview(null)
    if (floorPlanInputRef.current) floorPlanInputRef.current.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!loading) setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleAnalyze = async (retryFailed = false) => {
    if (!user) {
      setError('Sign in before uploading documents.')
      return
    }
    if (!uploadedFile && !floorPlanFile) {
      setError('Choose a lease PDF or a floor plan image.')
      return
    }
    try {
      setLoading(true)
      setError(null)
      setEmailSent(false)
      setEmailError('')
      const form = new FormData()
      if (uploadedFile && (!retryFailed || partialErrors.lease))
        form.append('lease', uploadedFile)
      if (floorPlanFile && (!retryFailed || partialErrors.floorPlan))
        form.append('floorplan', floorPlanFile)
      form.append('sendEmail', !retryFailed && emailRequested ? 'true' : 'false')
      if (email) form.append('email', email)
      const data = await api.analyzeDocuments(form)
      // The renderer uses lease fields at the top level and a separate floorPlan object.
      setAnalysis((previous: any) => ({
        ...(retryFailed ? previous : {}),
        ...data.analysis.lease,
        ...(data.analysis.floorPlan ? { floorPlan: data.analysis.floorPlan } : {}),
      }))
      setPartialErrors(data.errors || {})
      setEmailSent(data.emailSent === true)
      setEmailError(data.emailError || '')
      setGeneratedAt(data.generatedAt)
      setEmailEnvelope((previous: any) =>
        data.receipt
          ? {
              parts: [
                ...(retryFailed ? previous?.parts || [] : []),
                { analysis: data.analysis, receipt: data.receipt },
              ].slice(-2),
            }
          : null,
      )
      if (retryFailed && emailRequested && !data.partial)
        setEmailError('The analysis is complete. Use Retry email to send the completed report.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please retry.')
    } finally {
      setLoading(false)
    }
  }

  async function retryEmail() {
    if (!emailEnvelope || emailRetrying) return
    setEmailRetrying(true)
    try {
      const result = await apiJson(
        '/api/property/email',
        { method: 'POST', body: JSON.stringify(emailEnvelope) },
        45000,
      )
      setEmailSent(result.emailSent === true)
      setEmailError(result.emailError || '')
    } catch (e) {
      setEmailError((e as Error).message)
    } finally {
      setEmailRetrying(false)
    }
  }

  const clearFile = () => {
    setUploadedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <main id="main-content" className="min-h-screen">
      <Navigation />
      <div className="pt-32 pb-16 px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="workspace-header">
            <p className="eyebrow mb-4 text-primary">Document analysis</p>
            <h1 className="page-title mb-4">Read between the lines.</h1>
            <p className="text-lg text-foreground/70 max-w-2xl">
              Bring the lease. Add a floor plan if you have one. Review key terms, priorities,
              and the questions to ask before signing.
            </p>
          </div>

          {!authLoading && !user && (
            <p role="status" className="mb-6 rounded-xl border border-border p-5">
              Sign in before uploading documents.{' '}
              {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
                ? 'Use Sign In in the navigation.'
                : 'Google sign-in is not configured in this environment.'}
            </p>
          )}
          {user && features && (!features.leaseAnalysis || !features.floorPlanAnalysis) && (
            <p role="status" className="mb-6 rounded-xl bg-warning/10 p-4 text-warning">
              {!features.leaseAnalysis && 'Lease analysis is not configured. '}
              {!features.floorPlanAnalysis && 'Floor plan analysis is not configured. '}Your
              files will stay in this form if a request cannot complete.
            </p>
          )}
          {analysis && error && (
            <p role="alert" className="mb-5 rounded-xl bg-danger/10 p-4 text-danger">
              {error}
            </p>
          )}
          {/* Analyzer Form */}
          {!analysis && (
            <div className="bg-card rounded-3xl p-5 sm:p-8 md:p-10 shadow-soft border border-border">
              <div className="grid gap-6 sm:grid-cols-2">
                {/* File Upload Zone */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Lease Document (optional)
                  </label>
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    aria-label="Lease document upload area"
                    className={`relative min-h-64 border border-dashed rounded-xl p-5 text-center transition-colors duration-200 ${
                      isDragging
                        ? 'border-primary bg-primary/5'
                        : uploadedFile
                          ? 'border-primary/50 bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-card-alt'
                    }`}
                  >
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => fileInputRef.current?.click()}
                      className="btn btn-secondary mb-5"
                    >
                      {uploadedFile ? 'Change lease' : 'Choose lease'}
                    </button>
                    <input
                      aria-label="Lease document"
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(e) =>
                        e.target.files?.[0] && handleFileSelect(e.target.files[0])
                      }
                      className="hidden"
                    />
                    {uploadedFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileText size={24} className="text-primary" strokeWidth={1.5} />
                        <span className="min-w-0 break-all text-sm text-foreground font-medium">
                          {uploadedFile.name}
                        </span>
                        <button
                          aria-label="Remove lease document"
                          disabled={loading}
                          onClick={(e) => {
                            e.stopPropagation()
                            clearFile()
                          }}
                          className="p-1 hover:bg-foreground/10 rounded-full transition-colors"
                        >
                          <X size={18} className="text-muted-foreground" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <FileText
                          size={32}
                          className="mx-auto text-muted-foreground mb-3"
                          strokeWidth={1.5}
                        />
                        <p className="text-foreground/70 mb-1">Or drop your lease here.</p>
                        <p className="text-sm text-muted-foreground">PDF, up to 10MB</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Floor Plan Upload Zone */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Floor Plan Image (optional)
                  </label>
                  <div
                    onDrop={(e) => {
                      e.preventDefault()
                      setIsDraggingFloorPlan(false)
                      const file = e.dataTransfer.files[0]
                      if (file) handleFloorPlanSelect(file)
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      if (!loading) setIsDraggingFloorPlan(true)
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault()
                      setIsDraggingFloorPlan(false)
                    }}
                    aria-label="Floor plan upload area"
                    className={`relative min-h-64 border border-dashed rounded-xl p-5 text-center transition-colors duration-200 ${
                      isDraggingFloorPlan
                        ? 'border-info bg-info/5'
                        : floorPlanFile
                          ? 'border-info/50 bg-info/5'
                          : 'border-border hover:border-info/50 hover:bg-card-alt'
                    }`}
                  >
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => floorPlanInputRef.current?.click()}
                      className="btn btn-secondary mb-5"
                    >
                      {floorPlanFile ? 'Change floor plan' : 'Choose floor plan'}
                    </button>
                    <input
                      aria-label="Floor plan image"
                      ref={floorPlanInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                      onChange={(e) =>
                        e.target.files?.[0] && handleFloorPlanSelect(e.target.files[0])
                      }
                      className="hidden"
                    />
                    {floorPlanFile ? (
                      <div className="flex flex-col items-center gap-3">
                        {floorPlanPreview && (
                          <img
                            src={floorPlanPreview}
                            alt="Floor plan preview"
                            className="max-h-32 rounded-xl border border-border"
                          />
                        )}
                        <div className="flex items-center gap-3">
                          <Image size={20} className="text-info" strokeWidth={1.5} />
                          <span className="min-w-0 break-all text-sm text-foreground font-medium">
                            {floorPlanFile.name}
                          </span>
                          <button
                            aria-label="Remove floor plan"
                            disabled={loading}
                            onClick={(e) => {
                              e.stopPropagation()
                              clearFloorPlan()
                            }}
                            className="p-1 hover:bg-foreground/10 rounded-full transition-colors"
                          >
                            <X size={18} className="text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Image
                          size={32}
                          className="mx-auto text-muted-foreground mb-3"
                          strokeWidth={1.5}
                        />
                        <p className="text-foreground/70 mb-1">Or drop your floor plan here.</p>
                        <p className="text-sm text-muted-foreground">
                          PNG, JPEG, WebP, or GIF, up to 10MB
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="sm:col-span-2 border-t border-border pt-5">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email (optional)
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={emailRequested}
                      onChange={(e) => setEmailRequested(e.target.checked)}
                      disabled={!user || loading}
                    />
                    Email a copy to {user?.email || 'your signed-in address'}
                  </label>
                  <p className="mt-2 text-sm text-foreground/60">
                    Email status will appear after analysis. Sending requires a configured email
                    service.
                  </p>
                </div>

                <button
                  onClick={() => handleAnalyze()}
                  disabled={loading || !user || (!uploadedFile && !floorPlanFile)}
                  className="sm:col-span-2 w-full px-8 py-4 bg-foreground text-background rounded-full text-sm tracking-widest uppercase hover:bg-opacity-90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Upload size={18} strokeWidth={1.5} />
                  {loading
                    ? 'Analyzing...'
                    : uploadedFile && floorPlanFile
                      ? 'Analyze Both'
                      : 'Analyze'}
                </button>

                {loading && (
                  <div
                    role="status"
                    className="sm:col-span-2 flex items-center gap-3 text-sm text-muted-foreground"
                  >
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full motion-safe:animate-spin" />
                    Reading and analyzing your documents. This may take a minute.
                  </div>
                )}
                {!authLoading && !user && (
                  <p className="sm:col-span-2 text-sm text-muted-foreground">
                    Sign in using the navigation to analyze your documents.
                  </p>
                )}

                {error && (
                  <div className="sm:col-span-2 bg-danger/10 rounded-xl p-4 border border-danger/25">
                    <p role="alert" className="text-danger text-sm">
                      {error}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {analysis && (
            <div className="space-y-5 mb-6">
              <p className="text-sm text-muted-foreground">
                Document analysis ·{' '}
                {generatedAt ? new Date(generatedAt).toLocaleString() : 'Date unavailable'}.
                Observations are based on your uploaded files; unreported terms remain unknown.
              </p>
              {analysis.limitations?.map((note: unknown, i: number) => (
                <p
                  key={i}
                  role="note"
                  className="rounded-xl bg-warning/10 p-4 text-sm text-warning"
                >
                  {reportValue(note)}
                </p>
              ))}
              {Object.keys(partialErrors).length > 0 && (
                <div role="alert" className="rounded-xl bg-warning/10 p-5 text-warning">
                  <p>Partial analysis: {Object.values(partialErrors).join(' ')}</p>
                  <button
                    disabled={loading}
                    className="mt-3 underline"
                    onClick={() => handleAnalyze(true)}
                  >
                    {loading ? 'Retrying…' : 'Retry failed analysis'}
                  </button>
                </div>
              )}
              {emailSent && (
                <p role="status" className="rounded-xl bg-success/10 p-4 text-success">
                  Report email sent.
                </p>
              )}
              {emailError && (
                <div role="alert" className="rounded-xl bg-warning/10 p-4 text-warning">
                  <p>Email not confirmed: {emailError}</p>
                  {emailEnvelope && Object.keys(partialErrors).length === 0 && (
                    <button
                      disabled={emailRetrying}
                      onClick={retryEmail}
                      className="mt-3 underline"
                    >
                      {emailRetrying ? 'Retrying email…' : 'Retry email'}
                    </button>
                  )}
                </div>
              )}
              <AnalysisResults
                analysis={analysis}
                onReset={() => {
                  if (loading || emailRetrying) return
                  setAnalysis(null)
                  setPartialErrors({})
                  setEmailSent(false)
                  setEmailError('')
                  setEmailEnvelope(null)
                  setEmailRequested(false)
                  setError(null)
                  clearFile()
                  clearFloorPlan()
                }}
              />
            </div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  )
}
