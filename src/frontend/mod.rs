//! This module contains the frontend components for index page.
use js_sys::{
    Array, Function, JSON, Object, Reflect,
    wasm_bindgen::{JsCast, JsValue},
};
use leptos::{prelude::*, reactive::spawn_local};
use std::{collections::LinkedList, error::Error};
use wast::{
    core::Module,
    parser::{self, ParseBuffer},
};

mod boxlist;
mod textbox;

#[component]
pub fn App() -> impl IntoView {
    view! { <boxlist::Boxlist /> }
}

/// Hold all the code lines in a linked list as a buffer.
/// Each line is represented by a `CodeLineEntry`, it possesses the code text
/// in a `RwSignal` to allow reactive updates.
#[derive(Debug, Clone)]
struct EditorBuffer {
    lines: LinkedList<CodeLineEntry>,
    id_counter: usize,
    exec_result: (ReadSignal<String>, WriteSignal<String>),
}

impl Default for EditorBuffer {
    fn default() -> Self {
        Self {
            lines: Default::default(),
            id_counter: Default::default(),
            exec_result: signal(String::new()),
        }
    }
}

impl EditorBuffer {
    #[allow(dead_code)]
    pub fn concat(&self) -> String {
        self.lines
            .iter()
            .map(|entry| entry.value.get())
            .collect::<Vec<_>>()
            .join("\n")
    }

    pub fn push_line(&mut self) {
        self.id_counter += 1;
        self.lines.push_back(CodeLineEntry::new(self.id_counter));
    }

    pub fn pop_line(&mut self) {
        self.lines.pop_back();
    }

    pub fn execute(&self) {
        let module = self
            .lines
            .clone()
            .iter()
            .map(|e| e.value.get_untracked() + "\n")
            .collect::<String>();

        let writer = self.exec_result.1;
        spawn_local(async move {
            let r = run_binary(module, &writer).await;
            writer.set(match r {
                Ok(s) => s,
                Err(e) => format!("{e}"),
            });
        });
    }
}

async fn run_binary(
    module: String,
    writer: &WriteSignal<String>,
) -> Result<String, Box<dyn Error>> {
    let module = ParseBuffer::new(&module)?;
    let mut module = match parser::parse::<Module>(&module) {
        Ok(module) => module,
        Err(e) => {
            writer.set(e.to_string());
            return Err(e.into());
        }
    };
    let bin = module.encode()?;
    let promise = js_sys::WebAssembly::instantiate_buffer(&bin, &Object::new());
    let result = match wasm_bindgen_futures::JsFuture::from(promise).await {
        Ok(t) => Ok(t),
        Err(e) => Err(JSON::stringify(&e)
            .map_err(|_| "failed to stringify error".to_string())?
            .as_string()
            .ok_or_else(|| "stringify of error did not return string".to_string())?),
    }?;
    let instance = Reflect::get(&result, &JsValue::from_str("instance"))
        .map_err(|_| "failed to get instance")?;
    let exports = Reflect::get(&instance, &JsValue::from_str("exports"))
        .map_err(|_| "failed to get exports")?;
    let main = Reflect::get(&exports, &JsValue::from_str("main"))
        .map_err(|_| "failed to get main function")?;
    let main = main
        .dyn_ref::<Function>()
        .ok_or("main is not an exported function")?;
    let res = main
        .apply(&JsValue::null(), &Array::new())
        .map_err(|_| "failed to run main function")?;
    let string = JSON::stringify(&res).map_err(|_| "failed to stringify result")?;
    let string = string
        .as_string()
        .ok_or("stringify did not return string")?;

    Ok(string)
}

/// For now, it only holds a single line of code with a `RwSignal`
/// `RwSignal` will cause reactive updates when it is modified.
///
/// The id is unique to the containing EditorBuffer and is maintained across
/// insertions and deletions elsewhere in the buffer. This lets Leptos and
/// the browser avoid re-rendering unchanged lines.
#[derive(Debug, Clone)]
struct CodeLineEntry {
    pub value: RwSignal<String>,
    id: usize,
}

impl CodeLineEntry {
    /// ### Returns
    /// An instance holding an empty String.
    pub fn new(id: usize) -> CodeLineEntry {
        CodeLineEntry {
            value: RwSignal::new(String::new()),
            id,
        }
    }
}
