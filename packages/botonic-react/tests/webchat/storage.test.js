import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { Webchat } from '../../src/webchat/webchat'

describe('TEST: storage ', () => {
  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('Stores botonicState in the localStorage by default', async () => {
    await act(async () => {
      TestRenderer.create(<Webchat />)
    })
    expect(localStorage.getItem('botonicState')).not.toBeNull()
    expect(sessionStorage.getItem('botonicState')).toBeNull()
  })

  it('Stores botonicState in the localStorage', async () => {
    await act(async () => {
      TestRenderer.create(<Webchat storage={'localStorage'} />)
    })
    expect(localStorage.getItem('botonicState')).not.toBeNull()
    expect(sessionStorage.getItem('botonicState')).toBeNull()
  })

  it('Stores botonicState in the sessionStorage', async () => {
    await act(async () => {
      TestRenderer.create(<Webchat storage={'sessionStorage'} />)
    })
    expect(localStorage.getItem('botonicState')).toBeNull()
    expect(sessionStorage.getItem('botonicState')).not.toBeNull()
  })

  it('Does not store botonicState', async () => {
    await act(async () => {
      TestRenderer.create(<Webchat storage={'none'} />)
    })
    expect(localStorage.getItem('botonicState')).toBeNull()
    expect(sessionStorage.getItem('botonicState')).toBeNull()
  })
})
