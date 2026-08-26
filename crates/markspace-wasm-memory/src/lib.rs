//! Markspace Precision Memory Zeroize and Scrubbing Engine (WebAssembly)
//!
//! Provides deterministic memory allocation, compiler-barrier memory wiping (zeroize),
//! and constant-time memory comparisons to prevent memory residue in Web Crypto and Vault plaintext operations.

use std::alloc::{alloc, dealloc, Layout};
use std::sync::atomic::{compiler_fence, Ordering};

/// Allocates aligned linear memory of the given byte size.
#[no_mangle]
pub unsafe extern "C" fn ms_alloc(size: usize) -> *mut u8 {
    if size == 0 {
        return std::ptr::null_mut();
    }
    let layout = Layout::from_size_align_unchecked(size, 8);
    alloc(layout)
}

/// Frees previously allocated memory after scrubbing.
#[no_mangle]
pub unsafe extern "C" fn ms_dealloc(ptr: *mut u8, size: usize) {
    if ptr.is_null() || size == 0 {
        return;
    }
    // Scrub memory before deallocation
    ms_zeroize(ptr, size);
    let layout = Layout::from_size_align_unchecked(size, 8);
    dealloc(ptr, layout);
}

/// Overwrites the target memory region with 0x00 using volatile writes and compiler barriers.
/// This prevents LLVM and JavaScript JIT engines from optimizing away the write (Dead Code Elimination).
#[no_mangle]
pub unsafe extern "C" fn ms_zeroize(ptr: *mut u8, size: usize) {
    if ptr.is_null() || size == 0 {
        return;
    }
    
    // 1. Compiler barrier before write
    compiler_fence(Ordering::SeqCst);
    
    // 2. Volatile write to ensure physical memory is overwritten
    let mut current = ptr;
    let end = ptr.add(size);
    while current < end {
        std::ptr::write_volatile(current, 0u8);
        current = current.add(1);
    }
    
    // 3. Compiler barrier after write
    compiler_fence(Ordering::SeqCst);
}

/// Performs a constant-time byte comparison to protect against timing attacks on cryptographic hashes/tokens.
/// Returns 1 if identical, 0 otherwise.
#[no_mangle]
pub unsafe extern "C" fn ms_constant_time_eq(a_ptr: *const u8, b_ptr: *const u8, len: usize) -> u32 {
    if a_ptr.is_null() || b_ptr.is_null() {
        return 0;
    }
    
    let mut diff: u8 = 0;
    let mut i = 0;
    while i < len {
        let a_val = std::ptr::read_volatile(a_ptr.add(i));
        let b_val = std::ptr::read_volatile(b_ptr.add(i));
        diff |= a_val ^ b_val;
        i += 1;
    }
    
    if diff == 0 { 1 } else { 0 }
}

/// Securely copies memory with volatile semantics.
#[no_mangle]
pub unsafe extern "C" fn ms_secure_copy(src_ptr: *const u8, dst_ptr: *mut u8, len: usize) {
    if src_ptr.is_null() || dst_ptr.is_null() || len == 0 {
        return;
    }
    let mut i = 0;
    while i < len {
        let byte = std::ptr::read_volatile(src_ptr.add(i));
        std::ptr::write_volatile(dst_ptr.add(i), byte);
        i += 1;
    }
}
