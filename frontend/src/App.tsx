import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import Compare from './pages/Compare'
import Considerations from './pages/Considerations'
import Glossary from './pages/Glossary'
import Home from './pages/Home'
import Learn from './pages/Learn'
import NZ from './pages/NZ'
import Selector from './pages/Selector'
import Updates from './pages/Updates'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="learn" element={<Learn />} />
          <Route path="learn/considerations" element={<Considerations />} />
          <Route path="selector" element={<Selector />} />
          <Route path="compare" element={<Compare />} />
          <Route path="nz" element={<NZ />} />
          <Route path="glossary" element={<Glossary />} />
          <Route path="updates" element={<Updates />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
